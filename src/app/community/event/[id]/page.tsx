import CommunityEventDetailPage from "@/components/community/CommunityEventDetailPage";

type Props = { params: Promise<{ id: string }> };

export default async function Page({ params }: Props) {
  const { id } = await params;
  return <CommunityEventDetailPage id={id} />;
}
