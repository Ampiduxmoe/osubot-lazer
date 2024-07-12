export type PastAnouncementKey = {
  id: number;
};

export type PastAnouncement = PastAnouncementKey & {
  anouncementId: number;
  targets: string;
  time: number;
};
