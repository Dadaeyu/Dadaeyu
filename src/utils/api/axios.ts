import axios from "axios";

type Options = {
  headers?: Record<string, string>;
};

export async function GET<T>(url: string, options?: Options): Promise<T> {
  const { data } = await axios.get<T>(url, { headers: options?.headers });
  return data;
}

export async function POST<T>(url: string, body: unknown, options?: Options): Promise<T> {
  const { data } = await axios.post<T>(url, body, { headers: options?.headers });
  return data;
}
