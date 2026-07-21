#include "beam/design_strategy.hpp"

#include <algorithm>
#include <cmath>
#include <sstream>

namespace beam {

namespace {

// Fixed strut angle (cotTheta = 2.5, theta = 21.8 deg) rather than iterating
// to optimise capacity.
constexpr double kCotTheta = 2.5;

double clamp(double value, double lo, double hi) {
    return std::max(lo, std::min(hi, value));
}

std::string formatMm2(double value) {
    std::ostringstream out;
    out.precision(0);
    out << std::fixed << value;
    return out.str();
}

// ---------------------------------------------------------------------------
// Eurocode 2 (EN 1992-1-1)
// ---------------------------------------------------------------------------
class Eurocode2Strategy : public DesignStrategy {
public:
    CheckResult checkFlexure(const Section& section,
                              const ConcreteMaterial& concrete,
                              const SteelMaterial& steel,
                              double designMoment_kNm) const override {
        const double b = section.width_mm;
        const double d = section.effectiveDepth();
        const double fck = concrete.fck_MPa;
        const double fyk = steel.fyk_MPa;

        const double K = (designMoment_kNm * 1e6) / (b * d * d * fck);
        const double Kprime = 0.168; // ductility limit at no redistribution (EC2 6.1)
        const double capacity_kNm = Kprime * b * d * d * fck / 1e6;

        CheckResult result;
        result.name = "Flexure";
        result.demand = designMoment_kNm;
        result.capacity = capacity_kNm;

        if (K > Kprime) {
            result.pass = false;
            result.note = "Exceeds singly-reinforced capacity (K=" + std::to_string(K) +
                           " > K'=0.168) - enlarge the section or add compression steel";
            return result;
        }

        double z = d * (0.5 + std::sqrt(0.25 - K / 1.134));
        z = std::min(z, 0.95 * d);
        double As = (designMoment_kNm * 1e6) / (0.87 * fyk * z);

        const double fctm = 0.30 * std::pow(fck, 2.0 / 3.0); // EC2 Table 3.1, fck <= 50 MPa
        const double AsMin = std::max(0.26 * (fctm / fyk) * b * d, 0.0013 * b * d);
        const double AsMax = 0.04 * b * section.depth_mm;

        As = std::max(As, AsMin);
        result.pass = As <= AsMax;
        result.requiredSteel_mm2 = As;
        if (result.pass) {
            result.note = "As,req = " + formatMm2(As) + " mm^2 (z=" + formatMm2(z) + " mm)";
        } else {
            result.note = "Required As exceeds As,max (4% gross area) - enlarge the section";
        }
        return result;
    }

    CheckResult checkShear(const Section& section,
                            const ConcreteMaterial& concrete,
                            const SteelMaterial& steel,
                            double designShear_kN,
                            double providedTensionSteel_mm2) const override {
        const double bw = section.width_mm;
        const double d = section.effectiveDepth();
        const double fck = concrete.fck_MPa;
        const double fyk = steel.fyk_MPa;
        const double fcd = fck / 1.5;

        const double k = std::min(1.0 + std::sqrt(200.0 / d), 2.0);
        const double rho1 = std::min(providedTensionSteel_mm2 / (bw * d), 0.02);
        const double vMin = 0.035 * std::pow(k, 1.5) * std::sqrt(fck);
        const double vCalc = 0.12 * k * std::pow(100.0 * rho1 * fck, 1.0 / 3.0);
        const double VRdc_kN = std::max(vCalc, vMin) * bw * d / 1000.0;

        const double z = 0.9 * d;
        const double nu1 = 0.6 * (1.0 - fck / 250.0);
        const double VRdMax_kN = bw * z * nu1 * fcd / (kCotTheta + 1.0 / kCotTheta) / 1000.0;

        CheckResult result;
        result.name = "Shear";
        result.demand = designShear_kN;

        if (designShear_kN <= VRdc_kN) {
            result.capacity = VRdc_kN;
            result.pass = true;
            result.note = "No shear links required by calculation - provide nominal (minimum) links";
            return result;
        }

        result.capacity = VRdMax_kN;
        if (designShear_kN > VRdMax_kN) {
            result.pass = false;
            result.note = "Exceeds strut crushing capacity VRd,max - enlarge the section";
            return result;
        }

        const double AswOverS = (designShear_kN * 1000.0) / (z * 0.87 * fyk * kCotTheta); // mm^2/mm
        result.pass = true;
        result.note = "Links required: Asw/s = " + formatMm2(AswOverS * 1000.0) + " mm^2/m (cot(theta)=2.5)";
        return result;
    }

    CheckResult checkTorsion(const Section& section,
                              const ConcreteMaterial& concrete,
                              const SteelMaterial& steel,
                              double designTorsion_kNm,
                              double designShear_kN) const override {
        const double b = section.width_mm;
        const double h = section.depth_mm;
        const double fck = concrete.fck_MPa;
        const double fyk = steel.fyk_MPa;
        const double fyd = fyk / 1.15;
        const double fcd = fck / 1.5;

        const double A = b * h;
        const double u = 2.0 * (b + h);
        const double tef = std::max(A / u, 2.0 * section.cover_mm);
        const double Ak = (b - tef) * (h - tef);
        const double uk = 2.0 * ((b - tef) + (h - tef));

        const double theta = std::atan(1.0 / kCotTheta);
        const double sinCos = std::sin(theta) * std::cos(theta);
        const double nu = 0.6 * (1.0 - fck / 250.0);

        const double TRdMax_kNm = 2.0 * nu * fcd * Ak * tef * sinCos / 1e6;

        const double bw = section.width_mm;
        const double d = section.effectiveDepth();
        const double z = 0.9 * d;
        const double VRdMax_kN = bw * z * nu * fcd / (kCotTheta + 1.0 / kCotTheta) / 1000.0;

        CheckResult result;
        result.name = "Torsion";
        result.demand = designTorsion_kNm;
        result.capacity = TRdMax_kNm;

        if (designTorsion_kNm <= 1e-9) {
            result.pass = true;
            result.note = "No applied torsion";
            return result;
        }

        const double interaction = designTorsion_kNm / TRdMax_kNm + designShear_kN / VRdMax_kN;
        if (interaction > 1.0) {
            result.pass = false;
            result.note = "Combined shear/torsion crushing check exceeded (T/TRd,max + V/VRd,max = " +
                           std::to_string(interaction) + ") - enlarge the section";
            return result;
        }

        const double AswOverS_torsion = (designTorsion_kNm * 1e6) / (2.0 * Ak * 0.87 * fyk * kCotTheta); // mm^2/mm
        const double deltaAsl = (designTorsion_kNm * 1e6 * kCotTheta) / (2.0 * Ak) * (uk / fyd);

        result.pass = true;
        result.note = "Torsion links: Asw/s = " + formatMm2(AswOverS_torsion * 1000.0) +
                      " mm^2/m (additive to shear links); additional longitudinal steel = " +
                      formatMm2(deltaAsl) + " mm^2";
        return result;
    }
};

// ---------------------------------------------------------------------------
// SANS 10100-1
//
// Flexure and shear follow the BS 8110-derived form SANS 10100-1 is based
// on; coefficients should be checked against the current SANS 10100-1:2000
// text before use. Torsion in particular may be governed by reference to
// BS 8110 Part 2 rather than a clause set of its own - verify before relying
// on it for a real design.
// ---------------------------------------------------------------------------
class Sans10100Strategy : public DesignStrategy {
public:
    CheckResult checkFlexure(const Section& section,
                              const ConcreteMaterial& concrete,
                              const SteelMaterial& steel,
                              double designMoment_kNm) const override {
        const double b = section.width_mm;
        const double d = section.effectiveDepth();
        const double fcu = concrete.fck_MPa;
        const double fy = steel.fyk_MPa;

        const double K = (designMoment_kNm * 1e6) / (b * d * d * fcu);
        const double Kprime = 0.156; // x/d = 0.5 ductility limit
        const double capacity_kNm = Kprime * b * d * d * fcu / 1e6;

        CheckResult result;
        result.name = "Flexure";
        result.demand = designMoment_kNm;
        result.capacity = capacity_kNm;

        if (K > Kprime) {
            result.pass = false;
            result.note = "Exceeds singly-reinforced capacity (K=" + std::to_string(K) +
                           " > K'=0.156) - enlarge the section or add compression steel";
            return result;
        }

        double z = d * (0.5 + std::sqrt(0.25 - K / 0.9));
        z = std::min(z, 0.95 * d);
        double As = (designMoment_kNm * 1e6) / (0.87 * fy * z);

        const double AsMin = 0.0013 * b * section.depth_mm; // high-yield bars assumed
        const double AsMax = 0.04 * b * section.depth_mm;

        As = std::max(As, AsMin);
        result.pass = As <= AsMax;
        result.requiredSteel_mm2 = As;
        if (result.pass) {
            result.note = "As,req = " + formatMm2(As) + " mm^2 (z=" + formatMm2(z) + " mm)";
        } else {
            result.note = "Required As exceeds As,max (4% gross area) - enlarge the section";
        }
        return result;
    }

    CheckResult checkShear(const Section& section,
                            const ConcreteMaterial& concrete,
                            const SteelMaterial& steel,
                            double designShear_kN,
                            double providedTensionSteel_mm2) const override {
        const double b = section.width_mm;
        const double d = section.effectiveDepth();
        const double fcu = concrete.fck_MPa;
        const double fyv = steel.fyk_MPa;

        const double v = (designShear_kN * 1000.0) / (b * d);
        const double vu = std::min(0.8 * std::sqrt(fcu), 5.0); // crushing limit

        const double ratio = clamp(100.0 * providedTensionSteel_mm2 / (b * d), 0.15, 3.0);
        const double depthFactor = d < 400.0 ? std::pow(400.0 / d, 0.25) : 1.0;
        const double vc = 0.79 * std::pow(ratio, 1.0 / 3.0) * depthFactor *
                           std::pow(std::min(fcu, 40.0) / 25.0, 1.0 / 3.0) / 1.25;

        CheckResult result;
        result.name = "Shear";
        result.demand = designShear_kN;
        result.capacity = vu * b * d / 1000.0;

        if (v > vu) {
            result.pass = false;
            result.note = "Exceeds crushing limit (0.8*sqrt(fcu)) - enlarge the section";
            return result;
        }

        result.pass = true;
        if (v <= vc + 0.4) {
            result.note = "No shear links required by calculation - provide nominal (minimum) links";
        } else {
            const double AsvOverSv = b * (v - vc) / (0.87 * fyv); // mm^2/mm
            result.note = "Links required: Asv/sv = " + formatMm2(AsvOverSv * 1000.0) + " mm^2/m";
        }
        return result;
    }

    CheckResult checkTorsion(const Section& section,
                              const ConcreteMaterial& concrete,
                              const SteelMaterial& steel,
                              double designTorsion_kNm,
                              double /*designShear_kN*/) const override {
        const double b = section.width_mm;
        const double h = section.depth_mm;
        const double fcu = concrete.fck_MPa;
        const double fyv = steel.fyk_MPa;
        const double fy = steel.fyk_MPa;

        const double hmin = std::min(b, h);
        const double hmax = std::max(b, h);
        const double vtMin = std::min(0.067 * std::sqrt(fcu), 0.4);
        const double vtu = std::min(0.8 * std::sqrt(fcu), 5.0);

        const double sectionModulus = hmin * hmin * (hmax - hmin / 3.0);
        const double capacity_kNm = vtu * sectionModulus / 2.0 / 1e6;

        CheckResult result;
        result.name = "Torsion";
        result.demand = designTorsion_kNm;
        result.capacity = capacity_kNm;

        if (designTorsion_kNm <= 1e-9) {
            result.pass = true;
            result.note = "No applied torsion";
            return result;
        }

        const double vt = (2.0 * designTorsion_kNm * 1e6) / sectionModulus;

        if (vt > vtu) {
            result.pass = false;
            result.note = "Exceeds torsional crushing limit - enlarge the section";
            return result;
        }

        result.pass = true;
        if (vt <= vtMin) {
            result.note = "No torsion reinforcement required by calculation";
            return result;
        }

        const double x1 = b - 2.0 * section.cover_mm;
        const double y1 = h - 2.0 * section.cover_mm;
        const double AsvOverSv = (designTorsion_kNm * 1e6) / (0.8 * x1 * y1 * 0.87 * fyv); // mm^2/mm
        const double asl = AsvOverSv * (fyv / fy) * (x1 + y1);

        result.note = "Torsion links: Asv/sv = " + formatMm2(AsvOverSv * 1000.0) +
                      " mm^2/m; additional longitudinal steel = " + formatMm2(asl) + " mm^2";
        return result;
    }
};

} // namespace

std::unique_ptr<DesignStrategy> makeDesignStrategy(DesignCode code) {
    switch (code) {
        case DesignCode::EC2: return std::make_unique<Eurocode2Strategy>();
        case DesignCode::SANS10100: return std::make_unique<Sans10100Strategy>();
    }
    return nullptr;
}

} // namespace beam
