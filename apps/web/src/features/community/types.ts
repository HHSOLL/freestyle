export type CommunityPost = {
  id: number;
  user: string;
  image: string;
  likes: string;
  comments: string;
  tagKeys: string[];
};

export type CommunityTranslator = (key: string) => string;
