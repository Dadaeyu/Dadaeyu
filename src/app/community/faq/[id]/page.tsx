import CommunityFaqDetailPage from "@/components/community/CommunityFaqDetailPage";

type Props = { params: Promise<{ id: string }> };

export default async function Page({ params }: Props) {
  const { id } = await params;
  return <CommunityFaqDetailPage id={id} />;
}
