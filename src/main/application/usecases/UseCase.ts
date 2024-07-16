export interface UseCase<TRequest, TResponse> {
  execute(params: TRequest): Promise<TResponse>;
}
