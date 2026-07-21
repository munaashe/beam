#pragma once

#include <string>

#include "beam/design_code.hpp"
#include "beam/loads.hpp"
#include "beam/materials.hpp"
#include "beam/results.hpp"
#include "beam/section.hpp"
#include "beam/support.hpp"

namespace beam {

// A rectangular reinforced-concrete beam: geometry, materials, supports and
// loads, plus the ability to analyze, design and serialize itself.
class Beam {
public:
    void setSpan(double span_m) { span_m_ = span_m; }
    void setSupport(SupportType support) { support_ = support; }
    void setSection(Section section) { section_ = section; }
    void setConcrete(ConcreteMaterial concrete) { concrete_ = concrete; }
    void setSteel(SteelMaterial steel) { steel_ = steel; }
    void setLoadCase(LoadCase loadCase) { loadCase_ = std::move(loadCase); }
    void setDesignCode(DesignCode code) { designCode_ = code; }

    double span() const { return span_m_; }
    SupportType support() const { return support_; }
    const Section& section() const { return section_; }
    const ConcreteMaterial& concrete() const { return concrete_; }
    const SteelMaterial& steel() const { return steel_; }
    const LoadCase& loadCase() const { return loadCase_; }
    DesignCode designCode() const { return designCode_; }

    AnalysisResult analyze() const;
    DesignResult design() const;

    // Hand-written JSON - no external dependency.
    std::string toJson() const;
    static Beam fromJson(const std::string& json);

    void save(const std::string& path) const;
    static Beam load(const std::string& path);

private:
    double span_m_ = 6.0;
    SupportType support_ = SupportType::SimplySupported;
    Section section_;
    ConcreteMaterial concrete_;
    SteelMaterial steel_;
    LoadCase loadCase_;
    DesignCode designCode_ = DesignCode::EC2;
};

} // namespace beam
