#include "beam/support.hpp"

#include <stdexcept>

namespace beam {

std::string toString(SupportType support) {
    switch (support) {
        case SupportType::SimplySupported: return "SIMPLY_SUPPORTED";
        case SupportType::Cantilever: return "CANTILEVER";
    }
    throw std::invalid_argument("Unknown SupportType");
}

SupportType supportTypeFromString(const std::string& value) {
    if (value == "SIMPLY_SUPPORTED") return SupportType::SimplySupported;
    if (value == "CANTILEVER") return SupportType::Cantilever;
    throw std::invalid_argument("Unknown support type: " + value);
}

}
