#include "beam/results.hpp"

#include <sstream>

namespace beam {

namespace {

std::string escape(const std::string& value) {
    std::string out;
    out.reserve(value.size());
    for (char c : value) {
        if (c == '"' || c == '\\') out.push_back('\\');
        out.push_back(c);
    }
    return out;
}

std::string toJsonArray(const std::vector<double>& values) {
    std::ostringstream out;
    out << "[";
    for (size_t i = 0; i < values.size(); ++i) {
        if (i > 0) out << ", ";
        out << values[i];
    }
    out << "]";
    return out.str();
}

std::string toJson(const CheckResult& check) {
    std::ostringstream out;
    out << "{ \"name\": \"" << escape(check.name) << "\""
        << ", \"demand\": " << check.demand
        << ", \"capacity\": " << check.capacity
        << ", \"pass\": " << (check.pass ? "true" : "false")
        << ", \"note\": \"" << escape(check.note) << "\""
        << ", \"requiredSteel_mm2\": " << check.requiredSteel_mm2
        << " }";
    return out.str();
}

}

std::string toJson(const AnalysisResult& result) {
    std::ostringstream out;
    out << "{ \"reactionLeft\": " << result.reactionLeft_kN
        << ", \"reactionRight\": " << result.reactionRight_kN
        << ", \"maxMoment\": " << result.maxMoment_kNm
        << ", \"maxShear\": " << result.maxShear_kN
        << ", \"torsion\": " << result.torsion_kNm
        << ", \"diagramX\": " << toJsonArray(result.diagramX_m)
        << ", \"diagramShear\": " << toJsonArray(result.diagramShear_kN)
        << ", \"diagramMoment\": " << toJsonArray(result.diagramMoment_kNm)
        << " }";
    return out.str();
}

std::string toJson(const DesignResult& result) {
    std::ostringstream out;
    out << "{ \"flexure\": " << toJson(result.flexure)
        << ", \"shear\": " << toJson(result.shear)
        << ", \"torsion\": " << toJson(result.torsion)
        << " }";
    return out.str();
}

}
