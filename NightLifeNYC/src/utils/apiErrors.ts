export type ApiErrorKind = "network" | "server" | "client";

export class ApiError extends Error {
  readonly kind: ApiErrorKind;

  constructor(message: string, kind: ApiErrorKind) {
    super(message);
    this.name = "ApiError";
    this.kind = kind;
  }
}

function isNetworkFailure(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const msg = error.message.toLowerCase();
  return (
    msg.includes("network request failed") ||
    msg.includes("fetch failed") ||
    msg.includes("could not connect") ||
    msg.includes("failed to fetch") ||
    msg.includes("network error") ||
    msg.includes("timed out") ||
    error.name === "TypeError"
  );
}

export function getApiErrorAlert(error: unknown): {
  title: string;
  message: string;
} {
  if (error instanceof ApiError) {
    if (error.kind === "network") {
      return { title: "Cannot reach server", message: error.message };
    }
    if (error.kind === "server") {
      return { title: "Server error", message: error.message };
    }
    return { title: "Error", message: error.message };
  }

  if (isNetworkFailure(error)) {
    return {
      title: "Cannot reach server",
      message:
        "The app could not connect to the backend. Check your internet connection, or try again in a moment if the server is waking up.",
    };
  }

  return {
    title: "Error",
    message: error instanceof Error ? error.message : "Something went wrong",
  };
}
