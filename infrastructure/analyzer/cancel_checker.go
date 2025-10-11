package analyzer

// checkAnalysisCancelled checks if an analysis has been cancelled
func (ra *RepositoryAnalyzer) checkAnalysisCancelled(projectID int) (bool, error) {
	// If we have a cancel checker function, use it
	if ra.cancelChecker != nil {
		return ra.cancelChecker(projectID)
	}

	// Default behavior: no cancellation
	return false, nil
}

// SetCancelChecker sets a function to check if analysis should be cancelled
func (ra *RepositoryAnalyzer) SetCancelChecker(checker AnalysisCancelChecker) {
	ra.cancelChecker = checker
}
