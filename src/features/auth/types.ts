export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface MemberProfile {
  id: string;
  email: string;
  nickname: string;
  studentId: string | null;
  department: string | null;
  realname: string | null;
  photoUrl: string | null;
  isAdmin: boolean;
  joinedAt: string;
}

