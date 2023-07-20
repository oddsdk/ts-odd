This component signifies one of the user's identifiers.
Their identifier is used in conjunction with the account system and the agent.

Identifier delegates to agent, agent contacts remote account service, account service issues UCANs addressed to identifier. Those UCANs are then used throughout the SDK to check for capabilities, etc.

Also see agent component.
