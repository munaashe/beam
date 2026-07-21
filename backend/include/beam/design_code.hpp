#pragma once

#include <string>

namespace beam {

enum class DesignCode {
    EC2,        // Eurocode 2, EN 1992-1-1
    SANS10100,  // SANS 10100-1
};

std::string toString(DesignCode code);
DesignCode designCodeFromString(const std::string& value);

} // namespace beam
