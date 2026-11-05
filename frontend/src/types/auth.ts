export interface User {
  id: string;
  email: string;
  name: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ApiProblemDetails {
  status: number;
  title: string;
  detail: string | string[];
  instance: string;
  correlationId: string;
  timestamp: string;
}

export interface SignUpPayload {
  email: string;
  name: string;
  password: string;
}

export interface SignInPayload {
  email: string;
  password: string;
}
