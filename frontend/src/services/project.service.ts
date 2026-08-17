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

export const projectService = {
  async acceptProposal(proposalId: number, data: ProposalAcceptPayload): Promise<any> {
    return api.post(`/client/proposals/${proposalId}/accept`, data);
  },
  async getFreelancerProposals(): Promise<any[]> {
    return api.get("/freelancer/proposals");
  }
};
