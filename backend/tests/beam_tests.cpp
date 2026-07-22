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
    loadCase.addLoad({beam::LoadType::UDL, 25.0, 0.0, 6.0}); // 25 kN/m over the full 6 m span
    auto result = beam::analyze(6.0, beam::SupportType::SimplySupported, loadCase);

    assert(nearlyEqual(result.reactionLeft_kN, 75.0));       // wL/2
    assert(nearlyEqual(result.maxMoment_kNm, 112.5, 0.1));    // wL^2/8
    assert(nearlyEqual(result.maxShear_kN, 75.0, 0.1));       // wL/2

    assert(!result.diagramX_m.empty());
    assert(nearlyEqual(result.diagramX_m.front(), 0.0));
    assert(nearlyEqual(result.diagramX_m.back(), 6.0));
    size_t midIndex = result.diagramX_m.size() / 2;
    assert(nearlyEqual(result.diagramMoment_kNm[midIndex], 112.5, 0.1)); // wL^2/8 at mid-span
    std::cout << "testSimplySupportedUdl passed\n";
}

void testSimplySupportedPartialUdl() {
    beam::LoadCase loadCase;
    // 10 kN/m over [2, 6] on a 10 m span (not the full span, not centred).
    loadCase.addLoad({beam::LoadType::UDL, 10.0, 2.0, 4.0});
    auto result = beam::analyze(10.0, beam::SupportType::SimplySupported, loadCase);

    assert(nearlyEqual(result.reactionLeft_kN, 24.0));
    assert(nearlyEqual(result.reactionRight_kN, 16.0));
    assert(nearlyEqual(result.maxMoment_kNm, 76.8, 0.5)); // at zero-shear point x=4.4
    std::cout << "testSimplySupportedPartialUdl passed\n";
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
    loadCase.addLoad({beam::LoadType::UDL, 15.0, 0.0, 5.5});
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

}

int main() {
    testSimplySupportedUdl();
    testSimplySupportedPartialUdl();
    testCantileverPointLoad();
    testBeamJsonRoundTrip();
    std::cout << "All tests passed\n";
    return 0;
}
