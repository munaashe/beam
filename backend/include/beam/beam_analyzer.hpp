#pragma once

#include "beam/loads.hpp"
#include "beam/results.hpp"
#include "beam/support.hpp"

namespace beam {

// Pure statics for single-span, statically determinate beams (simply
// supported or cantilever) - code-independent, shared by every design strategy.
AnalysisResult analyze(double span_m, SupportType support, const LoadCase& loadCase);

}
