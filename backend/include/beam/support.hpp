#pragma once

#include <string>

namespace beam {

enum class SupportType {
    SimplySupported, // pin-pin
    Cantilever,      // fixed-free
};

std::string toString(SupportType support);
SupportType supportTypeFromString(const std::string& value);

} // namespace beam
