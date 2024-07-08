export type SerializedObjectKey = {
  key: string;
};

export type SerializedObject = SerializedObjectKey & {
  data: string;
};
