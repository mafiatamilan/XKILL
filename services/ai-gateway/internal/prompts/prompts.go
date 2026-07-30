package prompts

type PromptTemplate struct {
	Version     string `json:"version"`
	System      string `json:"system"`
	User        string `json:"user"`
	UseCase     string `json:"use_case"`
}

var templates = map[string]PromptTemplate{
	"code-review": {
		Version: "1.0",
		System: "You are an expert code reviewer. Analyze the provided code for bugs, " +
			"performance issues, security vulnerabilities, and style problems. " +
			"Provide actionable feedback with specific line numbers.",
		User:    "Please review this {{language}} code:\n\n{{code}}",
		UseCase: "code-review",
	},
	"resume-analyze": {
		Version: "1.0",
		System: "You are an expert resume reviewer. Analyze the resume and provide " +
			"feedback on structure, content, and impact. Suggest improvements " +
			"tailored for tech roles.",
		User:    "Analyze this resume:\n\n{{resume_text}}",
		UseCase: "resume-analyze",
	},
	"interview-prep": {
		Version: "1.0",
		System: "You are an interview preparation coach. Generate questions, " +
			"evaluate answers, and provide feedback for technical interviews.",
		User:    "Help me prepare for a {{role}} interview at {{company}}. Focus on {{topics}}.",
		UseCase: "interview-prep",
	},
	"chat": {
		Version: "1.0",
		System: "You are a helpful assistant for college students and recruiters " +
			"on a placement preparation platform. Provide accurate, concise help.",
		User:    "{{message}}",
		UseCase: "chat",
	},
}

func GetTemplate(useCase string) (PromptTemplate, bool) {
	tmpl, ok := templates[useCase]
	return tmpl, ok
}

func ListUseCases() []string {
	keys := make([]string, 0, len(templates))
	for k := range templates {
		keys = append(keys, k)
	}
	return keys
}
