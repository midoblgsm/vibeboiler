export class CliError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = "CliError";
  }
}

export class AuthError extends CliError {
  constructor(provider: string, cause?: unknown) {
    super(`Authentication failed for ${provider}. Check your token or credentials.`, cause);
    this.name = "AuthError";
  }
}

export class ConflictError extends CliError {
  constructor(message: string, cause?: unknown) {
    super(message, cause);
    this.name = "ConflictError";
  }
}

export class HttpError extends CliError {
  constructor(
    public readonly status: number,
    public readonly url: string,
    public readonly body: unknown,
  ) {
    super(`HTTP ${status} from ${url}: ${typeof body === "string" ? body : JSON.stringify(body)}`);
    this.name = "HttpError";
  }
}
