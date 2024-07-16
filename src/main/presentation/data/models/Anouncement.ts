export type AnouncementKey = {
  id: number;
};

export type Anouncement = AnouncementKey & {
  description: string;
  text: string;
};
