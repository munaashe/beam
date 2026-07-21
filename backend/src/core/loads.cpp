#include "beam/loads.hpp"

#include <stdexcept>

namespace beam {

std::string toString(LoadType type) {
    switch (type) {
        case LoadType::UDL: return "UDL";
        case LoadType::PointLoad: return "POINT_LOAD";
        case LoadType::PointMoment: return "POINT_MOMENT";
    }
    throw std::invalid_argument("Unknown LoadType");
}

LoadType loadTypeFromString(const std::string& value) {
    if (value == "UDL") return LoadType::UDL;
    if (value == "POINT_LOAD") return LoadType::PointLoad;
    if (value == "POINT_MOMENT") return LoadType::PointMoment;
    throw std::invalid_argument("Unknown load type: " + value);
}

} // namespace beam
