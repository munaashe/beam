#pragma once

namespace beam {

// Rectangular cross-section geometry, all dimensions in millimetres.
struct Section {
    double width_mm = 300.0;
    double depth_mm = 500.0;   // overall depth h
    double cover_mm = 30.0;    // nominal cover to the tension reinforcement centroid

    double effectiveDepth() const { return depth_mm - cover_mm; }
    double grossArea() const { return width_mm * depth_mm; }
};

}
