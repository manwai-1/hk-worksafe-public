export type RecType =
  | "incident"
  | "prosecution"
  | "alert"
  | "ordinance/regulation"
  | "code of practice"
  | "guidance";

export type RecStatus = "official" | "reported" | "updated";

export type SourceLink = {
  title: string;
  site: string;
  href: string;
};

export type UpdateLine = {
  key: string;
  value: string;
};

export type OshRecord = {
  id: string;
  datetime: string;
  type: RecType;
  titleEn: string;
  titleZh: string;
  summaryEn: string;
  summaryZh: string;
  legalEn: string;
  legalZh: string;
  sourceNote: string;
  status: RecStatus;
  officialSource: string;
  updatesEn: UpdateLine[];
  updatesZh: UpdateLine[];
  sources: SourceLink[];
  patternKey: string;
};

export type PatternGroup = {
  key: string;
  label: string;
  ids: string[];
};

export type FollowThread = {
  id: string;
  kind: string;
  ids: string[];
};

export type RegisterData = {
  records: OshRecord[];
  patternGroups: PatternGroup[];
  followThreads: FollowThread[];
  noParticulars: string[];
};
