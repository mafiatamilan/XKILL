package sandbox

import (
	"bytes"
	"context"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"
)

type TestCase struct {
	Input          string `json:"input"`
	ExpectedOutput string `json:"expected_output"`
}

type TestResult struct {
	Passed  bool   `json:"passed"`
	Input   string `json:"input"`
	Actual  string `json:"actual_output"`
	Error   string `json:"error,omitempty"`
}

type Result struct {
	Verdict     string       `json:"verdict"`
	Score       int          `json:"score"`
	TestResults []TestResult `json:"test_results"`
	TimeMs      int64        `json:"time_ms"`
	MemoryKb    int64        `json:"memory_kb"`
	Error       string       `json:"error,omitempty"`
}

type Sandbox interface {
	Run(code string, language string, testCases []TestCase) (*Result, error)
}

type sandboxImpl struct {
	tmpDir string
}

func New() Sandbox {
	dir, _ := os.MkdirTemp("", "judge-*")
	return &sandboxImpl{tmpDir: dir}
}

func (s *sandboxImpl) Run(code string, language string, testCases []TestCase) (*Result, error) {
	start := time.Now()
	results := make([]TestResult, 0, len(testCases))
	passed := 0

	for _, tc := range testCases {
		tr, err := s.runSingle(language, code, tc.Input)
		if err != nil {
			results = append(results, TestResult{
				Passed: false,
				Input:  tc.Input,
				Error:  err.Error(),
			})
			continue
		}

		isPassed := strings.TrimSpace(tr.Actual) == strings.TrimSpace(tc.ExpectedOutput)
		if isPassed {
			passed++
		}
		tr.Passed = isPassed
		results = append(results, tr)
	}

	elapsed := time.Since(start).Milliseconds()

	verdict := "Accepted"
	if passed < len(testCases) {
		verdict = "Wrong Answer"
	}
	if elapsed > 5000 {
		verdict = "Time Limit Exceeded"
	}

	return &Result{
		Verdict:     verdict,
		Score:       passed,
		TestResults: results,
		TimeMs:      elapsed,
		MemoryKb:    0,
	}, nil
}

func (s *sandboxImpl) runSingle(language, code, input string) (TestResult, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var cmd *exec.Cmd

	switch strings.ToLower(language) {
	case "python", "python3":
		cmd = exec.CommandContext(ctx, "python", "-c", code)
	case "javascript", "js":
		cmd = exec.CommandContext(ctx, "node", "-e", code)
	case "go":
		f := filepath.Join(s.tmpDir, "main.go")
		os.WriteFile(f, []byte(code), 0644)
		bin := filepath.Join(s.tmpDir, "out")
		build := exec.CommandContext(ctx, "go", "build", "-o", bin, f)
		if out, err := build.CombinedOutput(); err != nil {
			return TestResult{}, fmt.Errorf("compilation error: %s", string(out))
		}
		cmd = exec.CommandContext(ctx, bin)
	case "c":
		f := filepath.Join(s.tmpDir, "main.c")
		os.WriteFile(f, []byte(code), 0644)
		bin := filepath.Join(s.tmpDir, "c_out")
		build := exec.CommandContext(ctx, "gcc", "-o", bin, f)
		if out, err := build.CombinedOutput(); err != nil {
			return TestResult{}, fmt.Errorf("compilation error: %s", string(out))
		}
		cmd = exec.CommandContext(ctx, bin)
	case "cpp":
		f := filepath.Join(s.tmpDir, "main.cpp")
		os.WriteFile(f, []byte(code), 0644)
		bin := filepath.Join(s.tmpDir, "cpp_out")
		build := exec.CommandContext(ctx, "g++", "-o", bin, f)
		if out, err := build.CombinedOutput(); err != nil {
			return TestResult{}, fmt.Errorf("compilation error: %s", string(out))
		}
		cmd = exec.CommandContext(ctx, bin)
	case "java":
		f := filepath.Join(s.tmpDir, "Main.java")
		os.WriteFile(f, []byte(code), 0644)
		build := exec.CommandContext(ctx, "javac", f)
		if out, err := build.CombinedOutput(); err != nil {
			return TestResult{}, fmt.Errorf("compilation error: %s", string(out))
		}
		cmd = exec.CommandContext(ctx, "java", "-cp", s.tmpDir, "Main")
	case "rust":
		f := filepath.Join(s.tmpDir, "main.rs")
		os.WriteFile(f, []byte(code), 0644)
		bin := filepath.Join(s.tmpDir, "rust_out")
		build := exec.CommandContext(ctx, "rustc", "-o", bin, f)
		if out, err := build.CombinedOutput(); err != nil {
			return TestResult{}, fmt.Errorf("compilation error: %s", string(out))
		}
		cmd = exec.CommandContext(ctx, bin)
	default:
		return TestResult{}, fmt.Errorf("unsupported language: %s", language)
	}

	cmd.Stdin = bytes.NewBufferString(input)
	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	if err := cmd.Run(); err != nil {
		errMsg := strings.TrimSpace(stderr.String())
		if errMsg == "" {
			errMsg = err.Error()
		}
		return TestResult{Actual: stdout.String()}, fmt.Errorf("runtime error: %s", errMsg)
	}

	return TestResult{Actual: stdout.String()}, nil
}
