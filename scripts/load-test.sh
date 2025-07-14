#!/bin/bash

# PersonaLink Load Testing Script
# Usage: ./scripts/load-test.sh [url] [concurrent-users] [duration]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Default values
TARGET_URL=${1:-"https://personalink.vercel.app"}
CONCURRENT_USERS=${2:-10}
DURATION=${3:-60}

echo -e "${BLUE}🚀 Starting load test for PersonaLink...${NC}"
echo -e "${BLUE}🎯 Target: $TARGET_URL${NC}"
echo -e "${BLUE}👥 Concurrent users: $CONCURRENT_USERS${NC}"
echo -e "${BLUE}⏱️  Duration: $DURATION seconds${NC}"

# Check if curl is available
if ! command -v curl &> /dev/null; then
    echo -e "${RED}❌ curl not found${NC}"
    exit 1
fi

# Create temporary files for results
RESULTS_FILE=$(mktemp)
ERRORS_FILE=$(mktemp)

echo -e "${YELLOW}🔍 Testing basic connectivity...${NC}"

# Test basic connectivity
if curl -f "$TARGET_URL/api/health" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Health check passed${NC}"
else
    echo -e "${RED}❌ Health check failed${NC}"
    exit 1
fi

echo -e "${YELLOW}🚀 Starting load test...${NC}"

# Function to make a request and record results
make_request() {
    local start_time=$(date +%s%N)
    local response_code=$(curl -s -o /dev/null -w "%{http_code}" "$TARGET_URL/api/health" 2>/dev/null || echo "000")
    local end_time=$(date +%s%N)
    local duration=$(( (end_time - start_time) / 1000000 )) # Convert to milliseconds
    
    echo "$response_code,$duration" >> "$RESULTS_FILE"
    
    if [ "$response_code" != "200" ]; then
        echo "$(date): HTTP $response_code - $duration ms" >> "$ERRORS_FILE"
    fi
}

# Function to run concurrent requests
run_concurrent_requests() {
    local pids=()
    
    for ((i=1; i<=$CONCURRENT_USERS; i++)); do
        make_request &
        pids+=($!)
    done
    
    # Wait for all requests to complete
    for pid in "${pids[@]}"; do
        wait "$pid"
    done
}

# Main load test loop
start_time=$(date +%s)
end_time=$((start_time + DURATION))

echo -e "${BLUE}⏱️  Load test started at $(date)${NC}"

while [ $(date +%s) -lt $end_time ]; do
    run_concurrent_requests
    sleep 1
done

echo -e "${GREEN}✅ Load test completed!${NC}"

# Analyze results
echo -e "${YELLOW}📊 Analyzing results...${NC}"

total_requests=$(wc -l < "$RESULTS_FILE")
successful_requests=$(grep -c "^200," "$RESULTS_FILE" || echo "0")
failed_requests=$((total_requests - successful_requests))

# Calculate response times
if [ $total_requests -gt 0 ]; then
    avg_response_time=$(awk -F',' 'NR>0 {sum+=$2} END {print sum/NR}' "$RESULTS_FILE" 2>/dev/null || echo "0")
    min_response_time=$(awk -F',' 'NR>0 {if(min=="") min=$2; if($2<min) min=$2} END {print min}' "$RESULTS_FILE" 2>/dev/null || echo "0")
    max_response_time=$(awk -F',' 'NR>0 {if(max=="") max=$2; if($2>max) max=$2} END {print max}' "$RESULTS_FILE" 2>/dev/null || echo "0")
else
    avg_response_time=0
    min_response_time=0
    max_response_time=0
fi

# Calculate success rate
success_rate=$(awk "BEGIN {printf \"%.2f\", ($successful_requests / $total_requests) * 100}")

# Display results
echo -e "${BLUE}📈 Load Test Results:${NC}"
echo -e "   Total requests: $total_requests"
echo -e "   Successful: $successful_requests"
echo -e "   Failed: $failed_requests"
echo -e "   Success rate: ${success_rate}%"
echo -e "   Average response time: ${avg_response_time}ms"
echo -e "   Min response time: ${min_response_time}ms"
echo -e "   Max response time: ${max_response_time}ms"

# Display errors if any
if [ -s "$ERRORS_FILE" ]; then
    echo -e "${YELLOW}⚠️  Errors encountered:${NC}"
    head -10 "$ERRORS_FILE"
    if [ $(wc -l < "$ERRORS_FILE") -gt 10 ]; then
        echo -e "${YELLOW}   ... and $(($(wc -l < "$ERRORS_FILE") - 10)) more errors${NC}"
    fi
else
    echo -e "${GREEN}✅ No errors encountered${NC}"
fi

# Performance assessment
echo -e "${BLUE}📊 Performance Assessment:${NC}"

if (( $(echo "$success_rate >= 95" | bc -l) )); then
    echo -e "${GREEN}✅ Excellent performance (Success rate: ${success_rate}%)${NC}"
elif (( $(echo "$success_rate >= 90" | bc -l) )); then
    echo -e "${GREEN}✅ Good performance (Success rate: ${success_rate}%)${NC}"
elif (( $(echo "$success_rate >= 80" | bc -l) )); then
    echo -e "${YELLOW}⚠️  Acceptable performance (Success rate: ${success_rate}%)${NC}"
else
    echo -e "${RED}❌ Poor performance (Success rate: ${success_rate}%)${NC}"
fi

if (( $(echo "$avg_response_time <= 500" | bc -l) )); then
    echo -e "${GREEN}✅ Fast response times (Average: ${avg_response_time}ms)${NC}"
elif (( $(echo "$avg_response_time <= 1000" | bc -l) )); then
    echo -e "${YELLOW}⚠️  Moderate response times (Average: ${avg_response_time}ms)${NC}"
else
    echo -e "${RED}❌ Slow response times (Average: ${avg_response_time}ms)${NC}"
fi

# Cleanup
rm -f "$RESULTS_FILE" "$ERRORS_FILE"

echo -e "${GREEN}🎉 Load test completed successfully!${NC}" 