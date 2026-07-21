#pragma once

#include <string>

namespace beam {

struct AnalysisResult {
    double reactionLeft_kN = 0.0;
    double reactionRight_kN = 0.0;  // 0 for a cantilever (all reaction is at the fixed end)
    double maxMoment_kNm = 0.0;     // governing design moment magnitude
    double maxShear_kN = 0.0;       // governing design shear magnitude
    double torsion_kNm = 0.0;       // directly-entered applied design torsion
};

// One capacity check: a demand compared against a code-calculated capacity.
struct CheckResult {
    std::string name;    // "Flexure", "Shear", "Torsion"
    double demand = 0.0;
    double capacity = 0.0;
    bool pass = false;
    std::string note;    // human-readable required reinforcement, or why it failed
    double requiredSteel_mm2 = 0.0; // As (flexure) - used to feed shear's rho1 term
};

struct DesignResult {
    CheckResult flexure;
    CheckResult shear;
    CheckResult torsion;
};

std::string toJson(const AnalysisResult& result);
std::string toJson(const DesignResult& result);

} // namespace beam
