#include "beam/beam_analyzer.hpp"

#include <algorithm>
#include <cmath>
#include <vector>

namespace beam {

namespace {

// Dense enough to catch a UDL's mid-span peak without solving for the exact
// zero-shear location under arbitrary combinations of loads.
constexpr int kSamples = 401;

// Position is measured from x=0, which is the left support (simply
// supported) or the fixed end (cantilever).
double momentAt(double x, double span_m, SupportType support, const Load& load, double reactionLeft) {
    switch (load.type) {
        case LoadType::UDL: {
            if (support == SupportType::SimplySupported) {
                return reactionLeft * x - load.magnitude * x * x / 2.0;
            }
            double remaining = span_m - x;
            return -load.magnitude * remaining * remaining / 2.0; // hogging throughout
        }
        case LoadType::PointLoad: {
            double a = load.position_m;
            if (support == SupportType::SimplySupported) {
                return reactionLeft * x - (x >= a ? load.magnitude * (x - a) : 0.0);
            }
            return x < a ? -load.magnitude * (a - x) : 0.0;
        }
        case LoadType::PointMoment: {
            double a = load.position_m;
            if (support == SupportType::SimplySupported) {
                return reactionLeft * x + (x >= a ? load.magnitude : 0.0);
            }
            return x < a ? load.magnitude : 0.0;
        }
    }
    return 0.0;
}

double shearAt(double x, SupportType support, const Load& load, double reactionLeft, double span_m) {
    switch (load.type) {
        case LoadType::UDL: {
            if (support == SupportType::SimplySupported) {
                return reactionLeft - load.magnitude * x;
            }
            return load.magnitude * (span_m - x);
        }
        case LoadType::PointLoad: {
            double a = load.position_m;
            if (support == SupportType::SimplySupported) {
                return reactionLeft - (x >= a ? load.magnitude : 0.0);
            }
            return x < a ? load.magnitude : 0.0;
        }
        case LoadType::PointMoment:
            // A pure applied moment shifts the reaction but causes no local shear jump.
            return support == SupportType::SimplySupported ? reactionLeft : 0.0;
    }
    return 0.0;
}

double reactionLeftFor(double span_m, SupportType support, const Load& load) {
    if (support == SupportType::SimplySupported) {
        switch (load.type) {
            case LoadType::UDL: return load.magnitude * span_m / 2.0;
            case LoadType::PointLoad: return load.magnitude * (span_m - load.position_m) / span_m;
            case LoadType::PointMoment: return -load.magnitude / span_m;
        }
    } else { // Cantilever: all reaction is taken at the fixed end.
        switch (load.type) {
            case LoadType::UDL: return load.magnitude * span_m;
            case LoadType::PointLoad: return load.magnitude;
            case LoadType::PointMoment: return 0.0; // no net vertical force
        }
    }
    return 0.0;
}

double reactionRightFor(double span_m, SupportType support, const Load& load) {
    if (support != SupportType::SimplySupported) return 0.0;
    switch (load.type) {
        case LoadType::UDL: return load.magnitude * span_m / 2.0;
        case LoadType::PointLoad: return load.magnitude * load.position_m / span_m;
        case LoadType::PointMoment: return load.magnitude / span_m;
    }
    return 0.0;
}

} // namespace

AnalysisResult analyze(double span_m, SupportType support, const LoadCase& loadCase) {
    AnalysisResult result;

    std::vector<double> perLoadReactionLeft;
    perLoadReactionLeft.reserve(loadCase.loads().size());

    for (const auto& load : loadCase.loads()) {
        double rLeft = reactionLeftFor(span_m, support, load);
        perLoadReactionLeft.push_back(rLeft);
        result.reactionLeft_kN += rLeft;
        result.reactionRight_kN += reactionRightFor(span_m, support, load);
    }

    double maxAbsMoment = 0.0;
    double maxAbsShear = 0.0;
    for (int i = 0; i < kSamples; ++i) {
        double x = span_m * static_cast<double>(i) / static_cast<double>(kSamples - 1);
        double m = 0.0;
        double v = 0.0;
        for (std::size_t li = 0; li < loadCase.loads().size(); ++li) {
            m += momentAt(x, span_m, support, loadCase.loads()[li], perLoadReactionLeft[li]);
            v += shearAt(x, support, loadCase.loads()[li], perLoadReactionLeft[li], span_m);
        }
        maxAbsMoment = std::max(maxAbsMoment, std::abs(m));
        maxAbsShear = std::max(maxAbsShear, std::abs(v));
    }

    result.maxMoment_kNm = maxAbsMoment;
    result.maxShear_kN = maxAbsShear;
    result.torsion_kNm = loadCase.designTorsion();
    return result;
}

} // namespace beam
