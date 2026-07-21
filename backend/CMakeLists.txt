cmake_minimum_required(VERSION 3.20)

project(beam_backend VERSION 0.1.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

set(WARNING_FLAGS
    $<$<CXX_COMPILER_ID:MSVC>:/W4 /permissive->
    $<$<NOT:$<CXX_COMPILER_ID:MSVC>>:-Wall -Wextra -Wpedantic>
)

# beam_core: the domain model - pure calculation logic, no networking, no
# external dependencies, easy to test standalone.
add_library(beam_core STATIC
    src/core/support.cpp
    src/core/loads.cpp
    src/core/design_code.cpp
    src/core/results.cpp
    src/core/beam_analyzer.cpp
    src/core/design_strategy.cpp
    src/core/beam.cpp
)
target_include_directories(beam_core PUBLIC include)
target_compile_options(beam_core PRIVATE ${WARNING_FLAGS})

# beam_api: the HTTP server the frontend talks to.
add_executable(beam_api src/api/main.cpp)
target_link_libraries(beam_api PRIVATE beam_core)
target_compile_options(beam_api PRIVATE ${WARNING_FLAGS})

# beam_app: a small CLI for exercising the Beam class without the frontend.
add_executable(beam_app src/app/main.cpp)
target_link_libraries(beam_app PRIVATE beam_core)
target_compile_options(beam_app PRIVATE ${WARNING_FLAGS})

# beam_core_tests: a handful of plain-assert sanity checks, no test framework.
enable_testing()
add_executable(beam_core_tests tests/beam_tests.cpp)
target_link_libraries(beam_core_tests PRIVATE beam_core)
add_test(NAME beam_core_tests COMMAND beam_core_tests)
