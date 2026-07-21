#include <cassert>
#include <cmath>
#include <iostream>

#include "beam/beam.hpp"
#include "beam/beam_analyzer.hpp"

namespace {

bool nearlyEqual(double a, double b, double tolerance = 1e-6) {
    return std::abs(a - b) <= tolerance;
}

void testSimplySupportedUdl() {
    beam::LoadCase loadCase;
    loadCase.addLoad({beam::LoadType::UDL, 25.0, 0.0}); // 25 kN/m over a 6 m span
    auto result = beam::analyze(6.0, beam::SupportType::SimplySupported, loadCase);

    assert(nearlyEqual(result.reactionLeft_kN, 75.0));       // wL/2
    assert(nearlyEqual(result.maxMoment_kNm, 112.5, 0.1));    // wL^2/8
    assert(nearlyEqual(result.maxShear_kN, 75.0, 0.1));       // wL/2
    std::cout << "testSimplySupportedUdl passed\n";
}

void testCantileverPointLoad() {
    beam::LoadCase loadCase;
    loadCase.addLoad({beam::LoadType::PointLoad, 10.0, 4.0}); // 10 kN at the tip of a 4 m cantilever
    auto result = beam::analyze(4.0, beam::SupportType::Cantilever, loadCase);

    assert(nearlyEqual(result.reactionLeft_kN, 10.0));    // P
    assert(nearlyEqual(result.maxMoment_kNm, 40.0, 0.1)); // P * L, hogging at the fixed end
    std::cout << "testCantileverPointLoad passed\n";
}

void testBeamJsonRoundTrip() {
    beam::Beam original;
    original.setSpan(5.5);
    original.setSupport(beam::SupportType::Cantilever);
    original.setSection({250.0, 450.0, 35.0});
    original.setConcrete({30.0});
    original.setSteel({500.0});

    beam::LoadCase loadCase;
    loadCase.addLoad({beam::LoadType::UDL, 15.0, 0.0});
    loadCase.addLoad({beam::LoadType::PointLoad, 20.0, 3.0});
    loadCase.setDesignTorsion(8.0);
    original.setLoadCase(loadCase);
    original.setDesignCode(beam::DesignCode::SANS10100);

    beam::Beam restored = beam::Beam::fromJson(original.toJson());

    assert(nearlyEqual(restored.span(), original.span()));
    assert(restored.support() == original.support());
    assert(restored.designCode() == original.designCode());
    assert(nearlyEqual(restored.section().width_mm, original.section().width_mm));
    assert(nearlyEqual(restored.concrete().fck_MPa, original.concrete().fck_MPa));
    assert(nearlyEqual(restored.steel().fyk_MPa, original.steel().fyk_MPa));
    assert(restored.loadCase().loads().size() == original.loadCase().loads().size());
    assert(nearlyEqual(restored.loadCase().designTorsion(), original.loadCase().designTorsion()));
    std::cout << "testBeamJsonRoundTrip passed\n";
}

} // namespace

int main() {
    testSimplySupportedUdl();
    testCantileverPointLoad();
    testBeamJsonRoundTrip();
    std::cout << "All tests passed\n";
    return 0;
}
