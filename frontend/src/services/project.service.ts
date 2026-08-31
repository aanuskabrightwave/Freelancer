import { api } from "@/lib/api";

export interface ProposalAcceptPayload {
  scheduled_date: string;
  start_time: string;
  end_time: string;
  venue_name?: string;
  venue_address?: string;
  city?: string;
  state?: string;
}

export interface ProjectCreatePayload {
  title: string;
  description: string;
  project_type: string;
  budget_min: number;
  budget_max: number;
  category_id?: number;
  deadline?: string;
  city?: string;
  state?: string;
  country?: string;
}

export interface ProposalSubmitPayload {
  proposed_amount: number;
  delivery_days: number;
  cover_letter: string;
}

export const projectService = {
  async acceptProposal(proposalId: number, data: ProposalAcceptPayload): Promise<any> {
    return api.post(`/client/proposals/${proposalId}/accept`, data);
  },
  async getFreelancerProposals(): Promise<any[]> {
    return api.get("/freelancer/proposals");
  },
  async listProjects(params?: any): Promise<any[]> {
    return api.get<any[]>("/projects", { params });
  },
  async getProjectDetails(id: number | string): Promise<any> {
    return api.get<any>(`/projects/${id}`);
  },
  async createProject(data: ProjectCreatePayload): Promise<any> {
    return api.post<any>("/projects", data);
  },
  async getClientProjects(): Promise<any[]> {
    return api.get<any[]>("/client/projects");
  },
  async getClientProjectDetails(id: number | string): Promise<any> {
    return api.get<any>(`/client/projects/${id}`);
  },
  async closeClientProject(id: number | string): Promise<any> {
    return api.post<any>(`/client/projects/${id}/close`, {});
  },
  // Proposal Specific API Methods
  async submitProposal(projectId: number | string, data: ProposalSubmitPayload): Promise<any> {
    return api.post<any>(`/projects/${projectId}/proposals`, data);
  },
  async getMyProposals(): Promise<any[]> {
    return api.get<any[]>("/freelancer/proposals");
  },
  async withdrawProposal(proposalId: number | string): Promise<any> {
    return api.post<any>(`/proposals/${proposalId}/withdraw`, {});
  },
  async getReceivedProposals(projectId: number | string): Promise<any[]> {
    return api.get<any[]>(`/projects/${projectId}/proposals`);
  },
  async getClientProposalDetails(proposalId: number | string): Promise<any> {
    return api.get<any>(`/client/proposals/${proposalId}`);
  },
  async acceptClientProposal(proposalId: number | string): Promise<any> {
    return api.post<any>(`/client/proposals/${proposalId}/accept`, {});
  },
  async rejectClientProposal(proposalId: number | string): Promise<any> {
    return api.post<any>(`/client/proposals/${proposalId}/reject`, {});
  },
  async respondToAssignment(
    assignmentId: number | string,
    approved: boolean,
    notes?: string
  ): Promise<any> {
    return api.post(`/client/assignments/${assignmentId}/respond`, {
      approved,
      notes
    });
  }
};
