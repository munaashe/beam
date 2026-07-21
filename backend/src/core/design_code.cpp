#include "beam/design_code.hpp"

#include <stdexcept>

namespace beam {

std::string toString(DesignCode code) {
    switch (code) {
        case DesignCode::EC2: return "EC2";
        case DesignCode::SANS10100: return "SANS10100";
    }
    throw std::invalid_argument("Unknown DesignCode");
}

DesignCode designCodeFromString(const std::string& value) {
    if (value == "EC2") return DesignCode::EC2;
    if (value == "SANS10100") return DesignCode::SANS10100;
    throw std::invalid_argument("Unknown design code: " + value);
}

} // namespace beam
