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
double momentAt(double x, SupportType support, const Load& load, double reactionLeft) {
    switch (load.type) {
        case LoadType::UDL: {
            double a = load.position_m;
            double b = a + load.length_m;
            double w = load.magnitude;
            if (support == SupportType::SimplySupported) {
                if (x <= a) return reactionLeft * x;
                if (x < b) return reactionLeft * x - w * (x - a) * (x - a) / 2.0;
                return reactionLeft * x - w * (b - a) * (x - (a + b) / 2.0);
            }
            // Cantilever: governed by whatever load remains right of the cut.
            if (x >= b) return 0.0;
            if (x <= a) {
                double centroid = (a + b) / 2.0;
                return -w * (b - a) * (centroid - x); // hogging throughout
            }
            double remaining = b - x;
            return -w * remaining * remaining / 2.0;
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

double shearAt(double x, SupportType support, const Load& load, double reactionLeft) {
    switch (load.type) {
        case LoadType::UDL: {
            double a = load.position_m;
            double b = a + load.length_m;
            double w = load.magnitude;
            if (support == SupportType::SimplySupported) {
                if (x <= a) return reactionLeft;
                if (x < b) return reactionLeft - w * (x - a);
                return reactionLeft - w * (b - a);
            }
            if (x >= b) return 0.0;
            if (x <= a) return w * (b - a);
            return w * (b - x);
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
            case LoadType::UDL: {
                double a = load.position_m;
                double b = a + load.length_m;
                double totalLoad = load.magnitude * (b - a);
                double reactionRight = load.magnitude * (b - a) * (a + b) / (2.0 * span_m);
                return totalLoad - reactionRight;
            }
            case LoadType::PointLoad: return load.magnitude * (span_m - load.position_m) / span_m;
            case LoadType::PointMoment: return -load.magnitude / span_m;
        }
    } else { // Cantilever: all reaction is taken at the fixed end.
        switch (load.type) {
            case LoadType::UDL: return load.magnitude * load.length_m;
            case LoadType::PointLoad: return load.magnitude;
            case LoadType::PointMoment: return 0.0; // no net vertical force
        }
    }
    return 0.0;
}

double reactionRightFor(double span_m, SupportType support, const Load& load) {
    if (support != SupportType::SimplySupported) return 0.0;
    switch (load.type) {
        case LoadType::UDL: {
            double a = load.position_m;
            double b = a + load.length_m;
            return load.magnitude * (b - a) * (a + b) / (2.0 * span_m);
        }
        case LoadType::PointLoad: return load.magnitude * load.position_m / span_m;
        case LoadType::PointMoment: return load.magnitude / span_m;
    }
    return 0.0;
}

}

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
    result.diagramX_m.reserve(kSamples);
    result.diagramShear_kN.reserve(kSamples);
    result.diagramMoment_kNm.reserve(kSamples);
    for (int i = 0; i < kSamples; ++i) {
        double x = span_m * static_cast<double>(i) / static_cast<double>(kSamples - 1);
        double m = 0.0;
        double v = 0.0;
        for (std::size_t li = 0; li < loadCase.loads().size(); ++li) {
            m += momentAt(x, support, loadCase.loads()[li], perLoadReactionLeft[li]);
            v += shearAt(x, support, loadCase.loads()[li], perLoadReactionLeft[li]);
        }
        maxAbsMoment = std::max(maxAbsMoment, std::abs(m));
        maxAbsShear = std::max(maxAbsShear, std::abs(v));
        result.diagramX_m.push_back(x);
        result.diagramShear_kN.push_back(v);
        result.diagramMoment_kNm.push_back(m);
    }

    result.maxMoment_kNm = maxAbsMoment;
    result.maxShear_kN = maxAbsShear;
    result.torsion_kNm = loadCase.designTorsion();
    return result;
}

}
