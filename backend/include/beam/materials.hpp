#pragma once

namespace beam {

// Characteristic concrete strength. fck (EC2, cylinder) or fcu (SANS 10100, cube)
// share the same field - the design strategy interprets it per its own code.
struct ConcreteMaterial {
    double fck_MPa = 30.0;
};

struct SteelMaterial {
    double fyk_MPa = 500.0;
};

} // namespace beam
