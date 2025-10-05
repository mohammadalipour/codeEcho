## CodeEcho Performance Optimization Guide

Based on my analysis of your codebase, I've identified several performance issues that may be causing high resource usage during repository analysis. Here's a summary of findings and recommendations:

### Major Issues Identified

1. **Inefficient Git Operations**:
   - Repository cloning lacks depth limits
   - Each analysis creates a full copy of the repository
   - No timeout handling for large repositories

2. **Memory Management Problems**:
   - Loading entire file contents into memory for line counting
   - Processing all commits at once instead of in batches
   - No limits on maximum commits to analyze

3. **Aggressive Frontend Polling**:
   - Fixed 4-second interval polling regardless of analysis duration
   - No exponential backoff for longer-running analyses

4. **Concurrent Processing Limitations**:
   - Multiple analyses can run simultaneously with no resource limits
   - No queue system to prevent CPU/memory overload

### Recommended Short-Term Fixes

1. **Git Operation Improvements**:
   - Use shallow clones with `--depth` option
   - Implement timeouts for git operations
   - Add progress tracking for large repositories

```go
// Example improvement for CloneRepository
cloneOptions := &git.CloneOptions{
    URL:          repoURL,
    Depth:        20,           // Limit history depth
    SingleBranch: true,         // Only default branch
    Progress:     os.Stdout,
}
```

2. **Memory Optimization**:
   - Process commits in batches (max 500 at a time)
   - Use buffered readers for line counting instead of loading full files
   - Skip binary files and excessively large files

```go
// Example of batched processing
maxCommits := 500
commitCounter := 0
err = commitIter.ForEach(func(commit *object.Commit) error {
    commitCounter++
    if commitCounter > maxCommits {
        return fmt.Errorf("reached commit processing limit of %d", maxCommits)
    }
    // Process commit...
})
```

3. **Optimized Polling**:
   - Implement exponential backoff (starting at 4s, gradually increasing)
   - Add WebSocket support for push notifications

```javascript
// Exponential backoff example
const maxInterval = 30000; // Max 30 seconds
pollingIntervalRef.current = Math.min(pollingIntervalRef.current * 1.5, maxInterval);
```

4. **Resource Management**:
   - Implement analysis queue to limit concurrent operations
   - Add resource limits to Docker containers
   - Implement cancellation for long-running analyses

```yaml
# Docker Compose resource limits
services:
  codeecho-api:
    mem_limit: 1GB
    cpus: 1.0
```

### Long-Term Solutions

1. **Architecture Improvements**:
   - Split analysis into smaller tasks with separate workers
   - Implement a proper job queue with Redis or similar
   - Add progress reporting during analysis

2. **Database Optimizations**:
   - Batch database inserts
   - Add indexes for common queries
   - Implement pagination for large result sets

3. **User Experience Enhancements**:
   - Allow users to cancel long-running analyses
   - Provide estimated completion times
   - Add options to limit analysis scope

### Implementation Strategy

I've created patches with some of these improvements in `performance_improvements.patch`. You can:

1. Apply patches directly with `git apply [patchfile]`
2. Implement changes incrementally, starting with the most critical
3. Add monitoring to identify remaining bottlenecks

After implementing these changes, you should see significant reduction in resource usage during repository analysis.