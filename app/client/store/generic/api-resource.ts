/**
 * Represents a store resource that must be loaded from the server.
 */
export interface IAPIResource<T, U = object> {
  /**
   * Optional loading context to help discard post load operations that are
   * considered stale.
   */
  loadCtx?: number;
  /** This provides contextual data associated with this resource if necessary */
  ctx?: U;
  /** Indicates the resource is loading */
  isLoading: boolean;
  /** The data associated with the resource */
  data: T;
  /** Optional error information related to loading resources */
  error?: string;
}
