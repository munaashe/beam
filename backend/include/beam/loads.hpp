#pragma once

#include <string>
#include <vector>

namespace beam {

enum class LoadType {
    UDL,          // uniformly distributed load over the full span, kN/m
    PointLoad,    // kN, at `position_m` from the left/fixed support
    PointMoment,  // kNm, applied at `position_m`
};

std::string toString(LoadType type);
LoadType loadTypeFromString(const std::string& value);

// An already-factored ULS design action.
struct Load {
    LoadType type = LoadType::UDL;
    double magnitude = 0.0;   // kN/m, kN or kNm depending on `type`
    double position_m = 0.0;  // ignored for UDL (assumed full span)
};

// Applied loads plus a directly-entered design torsion (not derived from
// load eccentricity).
class LoadCase {
public:
    void addLoad(Load load) { loads_.push_back(load); }
    const std::vector<Load>& loads() const { return loads_; }

    void setDesignTorsion(double tEd_kNm) { designTorsion_kNm_ = tEd_kNm; }
    double designTorsion() const { return designTorsion_kNm_; }

private:
    std::vector<Load> loads_;
    double designTorsion_kNm_ = 0.0;
};

} // namespace beam
