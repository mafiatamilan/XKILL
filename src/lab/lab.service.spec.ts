import { LabService } from './lab.service';
import { LabRepository } from './lab.repository';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('LabService', () => {
  let service: LabService;
  let repository: LabRepository;

  const mockSubject = {
    id: 'sub-1',
    name: 'Data Structures',
    code: 'CS201',
    department: 'CSE',
    semester: 3,
  };

  const mockExperiment = {
    id: 'exp-1',
    subjectId: 'sub-1',
    title: 'Array Operations',
    description: 'Implement array operations',
    difficultyLevel: 'intermediate',
  };

  const mockSubmission = {
    id: 'sub-1',
    experimentId: 'exp-1',
    studentId: 'student-1',
    sourceCode: 'int main() { return 0; }',
    language: 'c',
    status: 'pending',
    submissionNumber: 1,
    compilationScore: 0,
    correctnessScore: 0,
    efficiencyScore: 0,
    codingStandardsScore: 0,
    documentationScore: 0,
    totalScore: 0,
    feedback: null,
  };

  const mockAssignment = {
    id: 'asgn-1',
    subjectId: 'sub-1',
    title: 'Linked List',
    description: 'Implement linked list',
  };

  const mockExam = {
    id: 'exam-1',
    subjectId: 'sub-1',
    title: 'Lab Exam 1',
    startTime: new Date('2026-09-01T10:00:00Z'),
    endTime: new Date('2026-09-01T12:00:00Z'),
    maxMarks: 100,
  };

  const mockViva = {
    id: 'viva-1',
    subjectId: 'sub-1',
    studentId: 'student-1',
    score: 8,
    totalMarks: 10,
  };

  const mockMiniProject = {
    id: 'proj-1',
    subjectId: 'sub-1',
    title: 'Library System',
    evaluationScore: null,
    evaluationFeedback: null,
  };

  beforeEach(() => {
    repository = {
      createSubject: jest.fn(),
      findSubjectById: jest.fn(),
      listSubjects: jest.fn(),
      updateSubject: jest.fn(),
      deleteSubject: jest.fn(),
      createExperiment: jest.fn(),
      findExperimentById: jest.fn(),
      listExperiments: jest.fn(),
      updateExperiment: jest.fn(),
      deleteExperiment: jest.fn(),
      getStudentSubmissionCount: jest.fn(),
      createSubmission: jest.fn(),
      findSubmissionById: jest.fn(),
      updateSubmission: jest.fn(),
      createAssignment: jest.fn(),
      findAssignmentById: jest.fn(),
      listAssignments: jest.fn(),
      updateAssignment: jest.fn(),
      deleteAssignment: jest.fn(),
      createExam: jest.fn(),
      findExamById: jest.fn(),
      listExams: jest.fn(),
      updateExam: jest.fn(),
      deleteExam: jest.fn(),
      startExamSession: jest.fn(),
      findExamSession: jest.fn(),
      updateExamSession: jest.fn(),
      createViva: jest.fn(),
      findVivaById: jest.fn(),
      listVivas: jest.fn(),
      updateViva: jest.fn(),
      deleteViva: jest.fn(),
      createMiniProject: jest.fn(),
      findMiniProjectById: jest.fn(),
      listMiniProjects: jest.fn(),
      updateMiniProject: jest.fn(),
      deleteMiniProject: jest.fn(),
      markAttendance: jest.fn(),
      listAttendance: jest.fn(),
      createCourseOutcome: jest.fn(),
      listCourseOutcomes: jest.fn(),
      createProgramOutcome: jest.fn(),
      listProgramOutcomes: jest.fn(),
      createCoPoMapping: jest.fn(),
      getCoPoMappings: jest.fn(),
      getSubjectAnalytics: jest.fn(),
      getStudentAnalytics: jest.fn(),
    } as unknown as LabRepository;

    service = new LabService(repository);
  });

  describe('Subject CRUD', () => {
    it('should create a subject', async () => {
      (repository.createSubject as jest.Mock).mockResolvedValue(mockSubject);
      const result = await service.createSubject('admin-1', {
        name: 'Data Structures',
        code: 'CS201',
      });
      expect(result).toEqual(mockSubject);
    });

    it('should get a subject by id', async () => {
      (repository.findSubjectById as jest.Mock).mockResolvedValue(mockSubject);
      const result = await service.getSubject('sub-1');
      expect(result).toEqual(mockSubject);
    });

    it('should throw NotFoundException for missing subject', async () => {
      (repository.findSubjectById as jest.Mock).mockResolvedValue(null);
      await expect(service.getSubject('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should list subjects with pagination', async () => {
      (repository.listSubjects as jest.Mock).mockResolvedValue({
        subjects: [mockSubject],
        total: 1,
      });
      const result = await service.listSubjects(1, 20);
      expect(result.data).toEqual([mockSubject]);
      expect(result.total).toBe(1);
      expect(result.totalPages).toBe(1);
    });

    it('should update a subject', async () => {
      (repository.findSubjectById as jest.Mock).mockResolvedValue(mockSubject);
      (repository.updateSubject as jest.Mock).mockResolvedValue({
        ...mockSubject,
        name: 'Updated',
      });
      const result = await service.updateSubject('sub-1', { name: 'Updated' });
      expect(result.name).toBe('Updated');
    });

    it('should delete a subject', async () => {
      (repository.findSubjectById as jest.Mock).mockResolvedValue(mockSubject);
      (repository.deleteSubject as jest.Mock).mockResolvedValue(undefined);
      await expect(service.deleteSubject('sub-1')).resolves.toBeUndefined();
    });
  });

  describe('Experiment CRUD', () => {
    it('should create an experiment', async () => {
      (repository.findSubjectById as jest.Mock).mockResolvedValue(mockSubject);
      (repository.createExperiment as jest.Mock).mockResolvedValue(mockExperiment);
      const result = await service.createExperiment('sub-1', { title: 'Array Operations' });
      expect(result).toEqual(mockExperiment);
    });

    it('should throw NotFoundException when creating experiment for missing subject', async () => {
      (repository.findSubjectById as jest.Mock).mockResolvedValue(null);
      await expect(service.createExperiment('nonexistent', { title: 'Test' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should get experiment by id', async () => {
      (repository.findExperimentById as jest.Mock).mockResolvedValue(mockExperiment);
      const result = await service.getExperiment('exp-1');
      expect(result).toEqual(mockExperiment);
    });

    it('should throw NotFoundException for missing experiment', async () => {
      (repository.findExperimentById as jest.Mock).mockResolvedValue(null);
      await expect(service.getExperiment('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('Submission', () => {
    it('should submit experiment code', async () => {
      (repository.findExperimentById as jest.Mock).mockResolvedValue(mockExperiment);
      (repository.getStudentSubmissionCount as jest.Mock).mockResolvedValue(0);
      (repository.createSubmission as jest.Mock).mockResolvedValue(mockSubmission);
      const result = await service.submitExperiment('exp-1', 'student-1', {
        sourceCode: 'code',
        language: 'c',
      });
      expect(result).toEqual(mockSubmission);
      expect(repository.createSubmission).toHaveBeenCalledWith(
        expect.objectContaining({ submissionNumber: 1 }),
      );
    });

    it('should increment submission number', async () => {
      (repository.findExperimentById as jest.Mock).mockResolvedValue(mockExperiment);
      (repository.getStudentSubmissionCount as jest.Mock).mockResolvedValue(2);
      (repository.createSubmission as jest.Mock).mockResolvedValue({
        ...mockSubmission,
        submissionNumber: 3,
      });
      await service.submitExperiment('exp-1', 'student-1', { sourceCode: 'code', language: 'c' });
      expect(repository.createSubmission).toHaveBeenCalledWith(
        expect.objectContaining({ submissionNumber: 3 }),
      );
    });

    it('should get submission results', async () => {
      (repository.findSubmissionById as jest.Mock).mockResolvedValue(mockSubmission);
      const result = await service.getSubmissionResults('sub-1');
      expect(result.id).toBe('sub-1');
      expect(result.status).toBe('pending');
    });

    it('should throw NotFoundException for missing submission', async () => {
      (repository.findSubmissionById as jest.Mock).mockResolvedValue(null);
      await expect(service.getSubmissionResults('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should evaluate submission', async () => {
      (repository.findSubmissionById as jest.Mock).mockResolvedValue(mockSubmission);
      (repository.updateSubmission as jest.Mock).mockResolvedValue({
        ...mockSubmission,
        totalScore: 80,
        status: 'graded',
      });
      const result = await service.evaluateSubmission('sub-1', {
        compilationScore: 20,
        correctnessScore: 30,
        efficiencyScore: 15,
        codingStandardsScore: 10,
        documentationScore: 5,
      });
      expect(result.totalScore).toBe(80);
      expect(result.status).toBe('graded');
    });
  });

  describe('Assignment CRUD', () => {
    it('should create an assignment', async () => {
      (repository.findSubjectById as jest.Mock).mockResolvedValue(mockSubject);
      (repository.createAssignment as jest.Mock).mockResolvedValue(mockAssignment);
      const result = await service.createAssignment('sub-1', { title: 'Linked List' });
      expect(result).toEqual(mockAssignment);
    });

    it('should list assignments', async () => {
      (repository.findSubjectById as jest.Mock).mockResolvedValue(mockSubject);
      (repository.listAssignments as jest.Mock).mockResolvedValue([mockAssignment]);
      const result = await service.listAssignments('sub-1');
      expect(result).toEqual([mockAssignment]);
    });
  });

  describe('Exam', () => {
    it('should create an exam', async () => {
      (repository.findSubjectById as jest.Mock).mockResolvedValue(mockSubject);
      (repository.createExam as jest.Mock).mockResolvedValue(mockExam);
      const result = await service.createExam('sub-1', { title: 'Lab Exam 1' });
      expect(result).toEqual(mockExam);
    });

    it('should throw on exam before start time', async () => {
      const earlyExam = {
        ...mockExam,
        startTime: new Date('2099-01-01T00:00:00Z'),
        endTime: new Date('2099-01-01T02:00:00Z'),
      };
      (repository.findExamById as jest.Mock).mockResolvedValue(earlyExam);
      await expect(service.startExamSession('exam-1', 'student-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should start exam session', async () => {
      const now = new Date();
      const activeExam = {
        ...mockExam,
        startTime: new Date(now.getTime() - 3600000),
        endTime: new Date(now.getTime() + 3600000),
      };
      (repository.findExamById as jest.Mock).mockResolvedValue(activeExam);
      (repository.startExamSession as jest.Mock).mockResolvedValue({
        id: 'session-1',
        status: 'in_progress',
      });
      const result = await service.startExamSession('exam-1', 'student-1');
      expect(result.status).toBe('in_progress');
    });
  });

  describe('Viva', () => {
    it('should create a viva', async () => {
      (repository.findSubjectById as jest.Mock).mockResolvedValue(mockSubject);
      (repository.createViva as jest.Mock).mockResolvedValue(mockViva);
      const result = await service.createViva('sub-1', {
        studentId: 'student-1',
        score: 8,
        totalMarks: 10,
      });
      expect(result).toEqual(mockViva);
    });

    it('should get viva by id', async () => {
      (repository.findVivaById as jest.Mock).mockResolvedValue(mockViva);
      const result = await service.getViva('viva-1');
      expect(result).toEqual(mockViva);
    });

    it('should throw NotFoundException for missing viva', async () => {
      (repository.findVivaById as jest.Mock).mockResolvedValue(null);
      await expect(service.getViva('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('Mini Project', () => {
    it('should create a mini project', async () => {
      (repository.findSubjectById as jest.Mock).mockResolvedValue(mockSubject);
      (repository.createMiniProject as jest.Mock).mockResolvedValue(mockMiniProject);
      const result = await service.createMiniProject('sub-1', { title: 'Library System' });
      expect(result).toEqual(mockMiniProject);
    });

    it('should evaluate mini project', async () => {
      (repository.findMiniProjectById as jest.Mock).mockResolvedValue(mockMiniProject);
      (repository.updateMiniProject as jest.Mock).mockResolvedValue({
        ...mockMiniProject,
        evaluationScore: 85,
        evaluationFeedback: 'Good work',
      });
      const result = await service.evaluateMiniProject('proj-1', {
        evaluationScore: 85,
        evaluationFeedback: 'Good work',
      });
      expect(result.evaluationScore).toBe(85);
    });
  });

  describe('Attendance', () => {
    it('should mark attendance', async () => {
      (repository.findSubjectById as jest.Mock).mockResolvedValue(mockSubject);
      (repository.markAttendance as jest.Mock).mockResolvedValue({ id: 'att-1' });
      const result = await service.markAttendance('sub-1', 'student-1', { type: 'lab' });
      expect(result.id).toBe('att-1');
    });

    it('should list attendance', async () => {
      (repository.findSubjectById as jest.Mock).mockResolvedValue(mockSubject);
      (repository.listAttendance as jest.Mock).mockResolvedValue([]);
      const result = await service.listAttendance('sub-1');
      expect(result).toEqual([]);
    });
  });

  describe('OBE', () => {
    it('should create course outcome', async () => {
      (repository.findSubjectById as jest.Mock).mockResolvedValue(mockSubject);
      (repository.createCourseOutcome as jest.Mock).mockResolvedValue({ id: 'co-1', code: 'CO1' });
      const result = await service.createCourseOutcome('sub-1', {
        code: 'CO1',
        description: 'Understand arrays',
      });
      expect(result.code).toBe('CO1');
    });

    it('should get attainment report', async () => {
      (repository.getCoPoMappings as jest.Mock).mockResolvedValue([
        { co: { code: 'CO1' }, po: { code: 'PO1' }, attainmentLevel: 3 },
      ]);
      (repository.listCourseOutcomes as jest.Mock).mockResolvedValue([{ id: 'co-1', code: 'CO1' }]);
      (repository.listProgramOutcomes as jest.Mock).mockResolvedValue([
        { id: 'po-1', code: 'PO1' },
      ]);
      const result = await service.getAttainmentReport('sub-1');
      expect(result.mappings).toHaveLength(1);
      expect(result.mappings[0].coCode).toBe('CO1');
    });
  });

  describe('Analytics', () => {
    it('should get student analytics', async () => {
      (repository.getStudentAnalytics as jest.Mock).mockResolvedValue({
        subjectCount: 3,
        submissionCount: 5,
        avgScore: 80,
      });
      const result = await service.getStudentAnalytics('student-1');
      expect(result.submissionCount).toBe(5);
    });

    it('should get semester dashboard', async () => {
      (repository.getStudentAnalytics as jest.Mock).mockResolvedValue({
        subjectCount: 3,
        submissionCount: 5,
        avgScore: 80,
      });
      const result = await service.getSemesterDashboard('student-1');
      expect(result.message).toBe('Semester dashboard data');
    });
  });
});
