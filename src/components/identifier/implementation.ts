export type Implementation = {
  /**
   * The DID belonging to the identifier.
   *
   * This'll be associated with your account and file system.
   */
  did: () => Promise<string>

  /**
   * For signing the agent delegation UCAN.
   *
   * The identifier system will always delegate to
   * the agent (non-exportable web-crypto key-pair)
   * so that future UCANs can be constructed easier
   * (eg. not having to approve signing each time)
   */
  sign: (data: Uint8Array) => Promise<Uint8Array>

  /**
   * The JWT `alg` used in the agent delegation UCAN.
   */
  ucanAlgorithm: () => Promise<string>
}