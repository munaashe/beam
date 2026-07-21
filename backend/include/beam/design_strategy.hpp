#pragma once

#include <memory>

#include "beam/design_code.hpp"
#include "beam/materials.hpp"
#include "beam/results.hpp"
#include "beam/section.hpp"

namespace beam {

// One implementation per design code (Eurocode 2, SANS 10100-1). Each check
// is independent of the others except that torsion needs to know how much
// shear capacity has already been used, since EC2 requires a combined
// shear/torsion crushing check against a shared strut angle.
class DesignStrategy {
public:
    virtual ~DesignStrategy() = default;

    virtual CheckResult checkFlexure(const Section& section,
                                      const ConcreteMaterial& concrete,
                                      const SteelMaterial& steel,
                                      double designMoment_kNm) const = 0;

    virtual CheckResult checkShear(const Section& section,
                                    const ConcreteMaterial& concrete,
                                    const SteelMaterial& steel,
                                    double designShear_kN,
                                    double providedTensionSteel_mm2) const = 0;

    virtual CheckResult checkTorsion(const Section& section,
                                      const ConcreteMaterial& concrete,
                                      const SteelMaterial& steel,
                                      double designTorsion_kNm,
                                      double designShear_kN) const = 0;
};

std::unique_ptr<DesignStrategy> makeDesignStrategy(DesignCode code);

} // namespace beam
