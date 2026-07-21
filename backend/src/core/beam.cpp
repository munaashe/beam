#include "beam/beam.hpp"

#include <cctype>
#include <fstream>
#include <sstream>
#include <stdexcept>
#include <vector>

#include "beam/beam_analyzer.hpp"
#include "beam/design_strategy.hpp"

namespace beam {

namespace {

// Schema-specific JSON reading, not a general-purpose parser - just enough
// for the flat Beam shape below.

std::string trim(const std::string& s) {
    size_t start = s.find_first_not_of(" \t\r\n");
    if (start == std::string::npos) return "";
    size_t end = s.find_last_not_of(" \t\r\n");
    return s.substr(start, end - start + 1);
}

std::string extractRaw(const std::string& json, const std::string& key) {
    std::string pattern = "\"" + key + "\"";
    size_t keyPos = json.find(pattern);
    if (keyPos == std::string::npos) {
        throw std::runtime_error("Beam JSON is missing required field: " + key);
    }
    size_t colon = json.find(':', keyPos);
    size_t valueStart = colon + 1;
    while (valueStart < json.size() && std::isspace(static_cast<unsigned char>(json[valueStart]))) {
        ++valueStart;
    }

    if (json[valueStart] == '"') {
        size_t end = json.find('"', valueStart + 1);
        return json.substr(valueStart, end - valueStart + 1);
    }
    if (json[valueStart] == '{' || json[valueStart] == '[') {
        char open = json[valueStart];
        char close = open == '{' ? '}' : ']';
        int depth = 0;
        size_t i = valueStart;
        for (; i < json.size(); ++i) {
            if (json[i] == open) ++depth;
            else if (json[i] == close && --depth == 0) { ++i; break; }
        }
        return json.substr(valueStart, i - valueStart);
    }
    size_t end = valueStart;
    while (end < json.size() && json[end] != ',' && json[end] != '}' && json[end] != ']') ++end;
    return trim(json.substr(valueStart, end - valueStart));
}

bool hasField(const std::string& json, const std::string& key) {
    return json.find("\"" + key + "\"") != std::string::npos;
}

double extractNumber(const std::string& json, const std::string& key) {
    return std::stod(extractRaw(json, key));
}

std::string extractString(const std::string& json, const std::string& key) {
    std::string raw = extractRaw(json, key);
    return raw.substr(1, raw.size() - 2);
}

std::vector<std::string> splitTopLevelObjects(const std::string& arrayBody) {
    std::vector<std::string> objects;
    int depth = 0;
    size_t start = 0;
    for (size_t i = 0; i < arrayBody.size(); ++i) {
        if (arrayBody[i] == '{') {
            if (depth == 0) start = i;
            ++depth;
        } else if (arrayBody[i] == '}') {
            if (--depth == 0) objects.push_back(arrayBody.substr(start, i - start + 1));
        }
    }
    return objects;
}

} // namespace

AnalysisResult Beam::analyze() const {
    return ::beam::analyze(span_m_, support_, loadCase_);
}

DesignResult Beam::design() const {
    AnalysisResult analysis = analyze();
    auto strategy = makeDesignStrategy(designCode_);

    DesignResult result;
    result.flexure = strategy->checkFlexure(section_, concrete_, steel_, analysis.maxMoment_kNm);
    result.shear = strategy->checkShear(section_, concrete_, steel_, analysis.maxShear_kN,
                                         result.flexure.requiredSteel_mm2);
    result.torsion = strategy->checkTorsion(section_, concrete_, steel_, analysis.torsion_kNm,
                                             analysis.maxShear_kN);
    return result;
}

std::string Beam::toJson() const {
    std::ostringstream out;
    out << "{\n";
    out << "  \"schemaVersion\": 1,\n";
    out << "  \"designCode\": \"" << ::beam::toString(designCode_) << "\",\n";
    out << "  \"support\": \"" << ::beam::toString(support_) << "\",\n";
    out << "  \"spanLength\": " << span_m_ << ",\n";
    out << "  \"section\": { \"width_mm\": " << section_.width_mm
        << ", \"depth_mm\": " << section_.depth_mm
        << ", \"cover_mm\": " << section_.cover_mm << " },\n";
    out << "  \"fck\": " << concrete_.fck_MPa << ",\n";
    out << "  \"fyk\": " << steel_.fyk_MPa << ",\n";
    out << "  \"torsion\": " << loadCase_.designTorsion() << ",\n";
    out << "  \"loads\": [\n";
    const auto& loads = loadCase_.loads();
    for (size_t i = 0; i < loads.size(); ++i) {
        const auto& load = loads[i];
        out << "    { \"type\": \"" << ::beam::toString(load.type)
            << "\", \"magnitude\": " << load.magnitude
            << ", \"position\": " << load.position_m << " }";
        if (i + 1 < loads.size()) out << ",";
        out << "\n";
    }
    out << "  ]\n";
    out << "}\n";
    return out.str();
}

Beam Beam::fromJson(const std::string& json) {
    Beam result;
    result.setDesignCode(designCodeFromString(extractString(json, "designCode")));
    result.setSupport(supportTypeFromString(extractString(json, "support")));
    result.setSpan(extractNumber(json, "spanLength"));

    std::string sectionRaw = extractRaw(json, "section");
    Section section;
    section.width_mm = extractNumber(sectionRaw, "width_mm");
    section.depth_mm = extractNumber(sectionRaw, "depth_mm");
    section.cover_mm = extractNumber(sectionRaw, "cover_mm");
    result.setSection(section);

    result.setConcrete(ConcreteMaterial{extractNumber(json, "fck")});
    result.setSteel(SteelMaterial{extractNumber(json, "fyk")});

    LoadCase loadCase;
    loadCase.setDesignTorsion(extractNumber(json, "torsion"));

    std::string loadsRaw = extractRaw(json, "loads");
    std::string loadsBody = loadsRaw.substr(1, loadsRaw.size() - 2);
    for (const auto& obj : splitTopLevelObjects(loadsBody)) {
        Load load;
        load.type = loadTypeFromString(extractString(obj, "type"));
        load.magnitude = extractNumber(obj, "magnitude");
        load.position_m = hasField(obj, "position") ? extractNumber(obj, "position") : 0.0;
        loadCase.addLoad(load);
    }
    result.setLoadCase(loadCase);

    return result;
}

void Beam::save(const std::string& path) const {
    std::ofstream file(path);
    if (!file) throw std::runtime_error("Could not open file for writing: " + path);
    file << toJson();
}

Beam Beam::load(const std::string& path) {
    std::ifstream file(path);
    if (!file) throw std::runtime_error("Could not open file for reading: " + path);
    std::ostringstream buffer;
    buffer << file.rdbuf();
    return fromJson(buffer.str());
}

} // namespace beam
