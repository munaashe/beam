#include <iostream>
#include <sstream>

#include "beam/beam.hpp"

// CLI: load a beam definition from a JSON file, print analysis and design
// results to stdout.
int main(int argc, char** argv) {
    if (argc != 2) {
        std::cerr << "Usage: " << argv[0] << " <beam.json>\n";
        return 1;
    }

    try {
        beam::Beam b = beam::Beam::load(argv[1]);
        beam::AnalysisResult analysis = b.analyze();
        beam::DesignResult design = b.design();

        std::cout << "Design code: " << beam::toString(b.designCode()) << "\n";
        std::cout << "Span: " << b.span() << " m, support: " << beam::toString(b.support()) << "\n\n";

        std::cout << "-- Analysis --\n";
        std::cout << "Reaction left:  " << analysis.reactionLeft_kN << " kN\n";
        std::cout << "Reaction right: " << analysis.reactionRight_kN << " kN\n";
        std::cout << "Max moment:     " << analysis.maxMoment_kNm << " kNm\n";
        std::cout << "Max shear:      " << analysis.maxShear_kN << " kN\n";
        std::cout << "Torsion:        " << analysis.torsion_kNm << " kNm\n\n";

        auto printCheck = [](const beam::CheckResult& c) {
            std::cout << c.name << ": demand=" << c.demand << ", capacity=" << c.capacity
                       << ", " << (c.pass ? "PASS" : "FAIL") << "\n  " << c.note << "\n";
        };

        std::cout << "-- Design --\n";
        printCheck(design.flexure);
        printCheck(design.shear);
        printCheck(design.torsion);
        return 0;
    } catch (const std::exception& e) {
        std::cerr << "Error: " << e.what() << "\n";
        return 1;
    }
}
