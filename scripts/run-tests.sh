#!/bin/bash

# PersonaLink Test Runner Script
# This script provides comprehensive testing capabilities for the PersonaLink application

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COVERAGE_DIR="$PROJECT_ROOT/coverage"
TEST_RESULTS_DIR="$PROJECT_ROOT/test-results"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Functions
print_header() {
    echo -e "${BLUE}================================${NC}"
    echo -e "${BLUE}  PersonaLink Test Runner${NC}"
    echo -e "${BLUE}================================${NC}"
    echo ""
}

print_section() {
    echo -e "${YELLOW}$1${NC}"
    echo "----------------------------------------"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

check_dependencies() {
    print_section "Checking Dependencies"
    
    # Check if Node.js is installed
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed"
        exit 1
    fi
    
    # Check if npm is installed
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed"
        exit 1
    fi
    
    # Check if Jest is available
    if ! npx jest --version &> /dev/null; then
        print_error "Jest is not installed. Run: npm install"
        exit 1
    fi
    
    print_success "All dependencies are available"
}

setup_environment() {
    print_section "Setting Up Environment"
    
    # Create test directories
    mkdir -p "$COVERAGE_DIR"
    mkdir -p "$TEST_RESULTS_DIR"
    
    # Set test environment variables
    export NODE_ENV=test
    export NEXT_PUBLIC_SUPABASE_URL="https://test.supabase.co"
    export NEXT_PUBLIC_SUPABASE_ANON_KEY="test-anon-key"
    export NEXT_PUBLIC_WS_URL="wss://test-ws.example.com"
    export REDIS_URL="redis://localhost:6379"
    export OPENAI_API_KEY="test-openai-key"
    
    print_success "Environment setup complete"
}

run_unit_tests() {
    print_section "Running Unit Tests"
    
    local start_time=$(date +%s)
    
    if npx jest --testPathPattern=__tests__/components --coverage --json --outputFile="$TEST_RESULTS_DIR/unit-tests-$TIMESTAMP.json"; then
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        print_success "Unit tests completed in ${duration}s"
    else
        print_error "Unit tests failed"
        return 1
    fi
}

run_integration_tests() {
    print_section "Running Integration Tests"
    
    local start_time=$(date +%s)
    
    if npx jest --testPathPattern=__tests__/app --coverage --json --outputFile="$TEST_RESULTS_DIR/integration-tests-$TIMESTAMP.json"; then
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        print_success "Integration tests completed in ${duration}s"
    else
        print_error "Integration tests failed"
        return 1
    fi
}

run_api_tests() {
    print_section "Running API Tests"
    
    local start_time=$(date +%s)
    
    if npx jest --testPathPattern=__tests__/app/api --coverage --json --outputFile="$TEST_RESULTS_DIR/api-tests-$TIMESTAMP.json"; then
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        print_success "API tests completed in ${duration}s"
    else
        print_error "API tests failed"
        return 1
    fi
}

run_library_tests() {
    print_section "Running Library Tests"
    
    local start_time=$(date +%s)
    
    if npx jest --testPathPattern=__tests__/lib --coverage --json --outputFile="$TEST_RESULTS_DIR/library-tests-$TIMESTAMP.json"; then
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        print_success "Library tests completed in ${duration}s"
    else
        print_error "Library tests failed"
        return 1
    fi
}

run_all_tests() {
    print_section "Running All Tests"
    
    local start_time=$(date +%s)
    
    if npx jest --coverage --json --outputFile="$TEST_RESULTS_DIR/all-tests-$TIMESTAMP.json"; then
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        print_success "All tests completed in ${duration}s"
    else
        print_error "Tests failed"
        return 1
    fi
}

generate_coverage_report() {
    print_section "Generating Coverage Report"
    
    if [ -d "$COVERAGE_DIR/lcov-report" ]; then
        print_success "Coverage report generated"
        print_info "Open coverage/lcov-report/index.html to view detailed coverage"
        
        # Print summary
        if [ -f "$COVERAGE_DIR/lcov-report/index.html" ]; then
            echo ""
            print_info "Coverage Summary:"
            cat "$COVERAGE_DIR/coverage-summary.txt" 2>/dev/null || echo "Coverage summary not available"
        fi
    else
        print_error "Coverage report not generated"
    fi
}

generate_test_report() {
    print_section "Generating Test Report"
    
    local report_file="$TEST_RESULTS_DIR/test-report-$TIMESTAMP.md"
    
    cat > "$report_file" << EOF
# PersonaLink Test Report

**Generated:** $(date)
**Timestamp:** $TIMESTAMP

## Test Summary

### Unit Tests
- **Status:** $(if [ -f "$TEST_RESULTS_DIR/unit-tests-$TIMESTAMP.json" ]; then echo "✅ Completed"; else echo "❌ Failed"; fi)
- **File:** unit-tests-$TIMESTAMP.json

### Integration Tests
- **Status:** $(if [ -f "$TEST_RESULTS_DIR/integration-tests-$TIMESTAMP.json" ]; then echo "✅ Completed"; else echo "❌ Failed"; fi)
- **File:** integration-tests-$TIMESTAMP.json

### API Tests
- **Status:** $(if [ -f "$TEST_RESULTS_DIR/api-tests-$TIMESTAMP.json" ]; then echo "✅ Completed"; else echo "❌ Failed"; fi)
- **File:** api-tests-$TIMESTAMP.json

### Library Tests
- **Status:** $(if [ -f "$TEST_RESULTS_DIR/library-tests-$TIMESTAMP.json" ]; then echo "✅ Completed"; else echo "❌ Failed"; fi)
- **File:** library-tests-$TIMESTAMP.json

## Coverage Information

Coverage reports are available in the \`coverage/\` directory.

## Next Steps

1. Review test results in the JSON files
2. Check coverage reports for areas needing improvement
3. Fix any failing tests
4. Add new tests for uncovered functionality

EOF

    print_success "Test report generated: $report_file"
}

cleanup() {
    print_section "Cleanup"
    
    # Remove old test results (keep last 5)
    find "$TEST_RESULTS_DIR" -name "*.json" -type f | sort | head -n -5 | xargs rm -f 2>/dev/null || true
    
    print_success "Cleanup completed"
}

show_help() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -h, --help              Show this help message"
    echo "  -u, --unit              Run unit tests only"
    echo "  -i, --integration       Run integration tests only"
    echo "  -a, --api               Run API tests only"
    echo "  -l, --library           Run library tests only"
    echo "  -c, --coverage          Generate coverage report"
    echo "  -r, --report            Generate test report"
    echo "  -w, --watch             Run tests in watch mode"
    echo "  -v, --verbose           Verbose output"
    echo "  --all                   Run all tests (default)"
    echo ""
    echo "Examples:"
    echo "  $0                      # Run all tests"
    echo "  $0 --unit               # Run unit tests only"
    echo "  $0 --coverage --report  # Run tests with coverage and generate report"
    echo "  $0 --watch              # Run tests in watch mode"
}

# Main execution
main() {
    print_header
    
    # Parse command line arguments
    RUN_UNIT=false
    RUN_INTEGRATION=false
    RUN_API=false
    RUN_LIBRARY=false
    GENERATE_COVERAGE=false
    GENERATE_REPORT=false
    WATCH_MODE=false
    VERBOSE=false
    RUN_ALL=true
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_help
                exit 0
                ;;
            -u|--unit)
                RUN_UNIT=true
                RUN_ALL=false
                shift
                ;;
            -i|--integration)
                RUN_INTEGRATION=true
                RUN_ALL=false
                shift
                ;;
            -a|--api)
                RUN_API=true
                RUN_ALL=false
                shift
                ;;
            -l|--library)
                RUN_LIBRARY=true
                RUN_ALL=false
                shift
                ;;
            -c|--coverage)
                GENERATE_COVERAGE=true
                shift
                ;;
            -r|--report)
                GENERATE_REPORT=true
                shift
                ;;
            -w|--watch)
                WATCH_MODE=true
                shift
                ;;
            -v|--verbose)
                VERBOSE=true
                shift
                ;;
            --all)
                RUN_ALL=true
                shift
                ;;
            *)
                print_error "Unknown option: $1"
                show_help
                exit 1
                ;;
        esac
    done
    
    # Check dependencies
    check_dependencies
    
    # Setup environment
    setup_environment
    
    # Change to project root
    cd "$PROJECT_ROOT"
    
    # Run tests based on options
    if [ "$WATCH_MODE" = true ]; then
        print_section "Running Tests in Watch Mode"
        npx jest --watch
    else
        if [ "$RUN_ALL" = true ]; then
            run_all_tests
        else
            if [ "$RUN_UNIT" = true ]; then
                run_unit_tests
            fi
            
            if [ "$RUN_INTEGRATION" = true ]; then
                run_integration_tests
            fi
            
            if [ "$RUN_API" = true ]; then
                run_api_tests
            fi
            
            if [ "$RUN_LIBRARY" = true ]; then
                run_library_tests
            fi
        fi
    fi
    
    # Generate reports if requested
    if [ "$GENERATE_COVERAGE" = true ] && [ "$WATCH_MODE" = false ]; then
        generate_coverage_report
    fi
    
    if [ "$GENERATE_REPORT" = true ] && [ "$WATCH_MODE" = false ]; then
        generate_test_report
    fi
    
    # Cleanup
    cleanup
    
    print_success "Test execution completed!"
}

# Run main function with all arguments
main "$@" 