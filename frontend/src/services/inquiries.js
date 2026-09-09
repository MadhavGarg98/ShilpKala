import { useAppStore } from '../store/useAppStore';

const delay = (ms) => new Promise((res) => setTimeout(res, ms));

// TODO: BACKEND — replace with: GET /api/inquiries?artisanId={artisanId}
export async function getInquiries(artisanId) {
  await delay(700);
  return useAppStore.getState().inquiries;
}

// TODO: BACKEND — replace with: POST /api/inquiries/{inquiryId}/reply
export async function sendInquiryReply(inquiryId, replyData) {
  await delay(900);
  
  useAppStore.getState().updateInquiryStatus(inquiryId, 'replied');
  
  return {
    success: true,
    status: 'replied',
  };
}
