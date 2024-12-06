export interface ISession {
  account: {
    label: string;
  };
}

export const DefaultSession: ISession = {
  account: {
    label: "anymous",
  },
};
