export enum LINK_OPTIONS {
    IDs,
    URNs // not currently supported
}

export enum RULES {
    NO_CONFIG_LINKS_TO_ASSETS
}

export interface IRules {
    ignoreRules: boolean
    maxResourceDepth: number
    maxActionDepth: number
    actionsOnRequestsOnly: boolean
    links: LINK_OPTIONS
    returnBodyOnUpdate: boolean
    checkRules: RULES[]
}
