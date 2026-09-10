export type PhoneMode = "private" | "community";
export type PrivateScreen = "dashboard" | "chat" | "actionResult";
export type CommunityScreen = "explorer" | "details" | "communityHome" | "ask";
export type PrivateAction = "task" | "event" | "proposal" | "budget";

export type PhoneState = {
  mode: PhoneMode;
  privateScreen: PrivateScreen;
  communityScreen: CommunityScreen;
  privateAction: PrivateAction | null;
  selectedCommunity: string | null;
  bestAnswerId: string | null;
  xp: number;
  levelProgress: number;
};

export type PhoneAction =
  | { type: "switchMode"; mode: PhoneMode }
  | { type: "privateScreen"; screen: PrivateScreen }
  | { type: "communityScreen"; screen: CommunityScreen }
  | { type: "convertMessage"; action: PrivateAction }
  | { type: "selectCommunity"; community: string }
  | { type: "selectBestAnswer"; answerId: string }
  | { type: "resetAsk" };

export function createInitialPhoneState(): PhoneState {
  return {
    mode: "private",
    privateScreen: "dashboard",
    communityScreen: "explorer",
    privateAction: null,
    selectedCommunity: null,
    bestAnswerId: null,
    xp: 620,
    levelProgress: 62,
  };
}

export function phoneReducer(state: PhoneState, action: PhoneAction): PhoneState {
  switch (action.type) {
    case "switchMode":
      return action.mode === "private"
        ? { ...state, mode: "private", privateScreen: "dashboard", privateAction: null }
        : {
            ...state,
            mode: "community",
            communityScreen: "explorer",
            selectedCommunity: null,
            bestAnswerId: null,
            xp: 620,
            levelProgress: 62,
          };
    case "privateScreen":
      return { ...state, mode: "private", privateScreen: action.screen };
    case "communityScreen":
      return { ...state, mode: "community", communityScreen: action.screen };
    case "convertMessage":
      return {
        ...state,
        mode: "private",
        privateAction: action.action,
        privateScreen: "actionResult",
      };
    case "selectCommunity":
      return {
        ...state,
        mode: "community",
        selectedCommunity: action.community,
        communityScreen: "details",
      };
    case "selectBestAnswer":
      return {
        ...state,
        mode: "community",
        communityScreen: "ask",
        bestAnswerId: action.answerId,
        xp: 760,
        levelProgress: 76,
      };
    case "resetAsk":
      return {
        ...state,
        mode: "community",
        communityScreen: "ask",
        bestAnswerId: null,
        xp: 620,
        levelProgress: 62,
      };
    default:
      return state;
  }
}
