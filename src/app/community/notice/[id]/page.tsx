import CommunityNoticeDetailPage from "@/components/community/CommunityNoticeDetailPage";

type Props = { params: Promise<{ id: string }> };

export default async function Page({ params }: Props) {
  const { id } = await params;
  return <CommunityNoticeDetailPage id={id} />;
}
