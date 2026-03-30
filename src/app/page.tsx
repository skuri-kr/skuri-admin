import {
  Badge,
  Box,
  Button,
  Container,
  Flex,
  Heading,
  HStack,
  List,
  Stack,
  Text,
} from "@chakra-ui/react";
import { ColorModeButton } from "@/components/ui/color-mode";
import Link from "next/link";

const readyModules = [
  "앱 공지",
  "캠퍼스 배너",
  "앱 버전",
  "법적 문서",
  "학식 메뉴",
  "학사 일정",
  "강의 bulk",
  "문의",
  "신고",
  "학교 공지 목록 + 동기화",
];

const partialModules = [
  "대시보드 KPI",
  "사용자 관리",
  "택시 파티 관리",
  "공개 채팅방 관리",
  "게시물 관리",
];

const immediateTasks = [
  "Firebase 로그인 + Spring Admin API 인증 체인 정리",
  "공통 Admin Shell, API 클라이언트, 권한 가드 구현",
  "Spring API 지원 화면부터 우선 구현",
  "미지원 영역은 placeholder 화면과 백엔드 요청 연결",
];

function StatusSection({
  eyebrow,
  title,
  description,
  badgeLabel,
  badgeColor,
  items,
}: {
  eyebrow: string;
  title: string;
  description: string;
  badgeLabel: string;
  badgeColor: "green" | "orange" | "blue";
  items: string[];
}) {
  return (
    <Box
      rounded="2xl"
      borderWidth="1px"
      borderColor="blackAlpha.100"
      bg="white"
      px={{ base: 5, md: 7 }}
      py={{ base: 5, md: 6 }}
      shadow="sm"
      _dark={{
        bg: "gray.900",
        borderColor: "whiteAlpha.200",
      }}
    >
      <Stack gap="4">
        <HStack justify="space-between" align="start">
          <Stack gap="1">
            <Text
              fontSize="xs"
              fontWeight="700"
              letterSpacing="0.18em"
              textTransform="uppercase"
              color="gray.500"
            >
              {eyebrow}
            </Text>
            <Heading size="lg">{title}</Heading>
          </Stack>
          <Badge colorPalette={badgeColor} rounded="full" px="3" py="1">
            {badgeLabel}
          </Badge>
        </HStack>

        <Text color="gray.600" _dark={{ color: "gray.300" }}>
          {description}
        </Text>

        <List.Root gap="2" ps="5">
          {items.map((item) => (
            <List.Item key={item}>{item}</List.Item>
          ))}
        </List.Root>
      </Stack>
    </Box>
  );
}

export default function Home() {
  return (
    <Box
      minH="100vh"
      bgGradient="linear(to-br, orange.50, white, teal.50)"
      _dark={{
        bgGradient: "linear(to-br, gray.950, gray.900, teal.950)",
      }}
    >
      <Container maxW="7xl" py={{ base: 10, md: 16 }}>
        <Stack gap="8">
          <Flex justify="space-between" align="start" gap="4" wrap="wrap">
            <Stack gap="4" maxW="4xl">
              <Badge
                alignSelf="start"
                colorPalette="orange"
                rounded="full"
                px="3"
                py="1"
              >
                Bootstrap Ready
              </Badge>

              <Stack gap="3">
                <Heading size="2xl" lineHeight="1.1">
                  SKURI Admin
                </Heading>
                <Text fontSize={{ base: "md", md: "lg" }} maxW="3xl">
                  Spring 기반 `skuri-backend` 운영 콘솔 프로젝트를 시작했습니다.
                  기존 Firebase 콘솔을 그대로 이식하지 않고, 현재 Spring API로
                  구현 가능한 운영 화면부터 먼저 구축합니다.
                </Text>
              </Stack>
            </Stack>

            <ColorModeButton size="md" />
          </Flex>

          <Box
            rounded="2xl"
            bg="black"
            color="white"
            px={{ base: 5, md: 7 }}
            py={{ base: 5, md: 6 }}
            _dark={{ bg: "white", color: "black" }}
          >
            <Stack gap="3">
              <Text fontSize="xs" fontWeight="700" letterSpacing="0.18em">
                CURRENT FOCUS
              </Text>
              <Heading size="lg">
                계획 문서와 백엔드 API 갭 문서를 먼저 고정
              </Heading>
              <Text opacity="0.8">
                구현 가능 영역과 placeholder 영역을 분리해서 진행합니다. 백엔드
                수정이 필요한 항목은 이 프로젝트에서 임의 구현하지 않고 별도
                요청 대상으로 남깁니다.
              </Text>

              <HStack gap="3" wrap="wrap">
                <Button asChild colorPalette="orange">
                  <Link href="/login">로그인으로 이동</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/dashboard">관리자 화면 보기</Link>
                </Button>
              </HStack>
            </Stack>
          </Box>

          <Stack gap="6">
            <StatusSection
              eyebrow="Phase 1"
              title="바로 구현 가능한 운영 화면"
              description="현재 Spring 계약만으로 조회/수정 흐름을 만들 수 있는 영역입니다."
              badgeLabel="API Ready"
              badgeColor="green"
              items={readyModules}
            />

            <StatusSection
              eyebrow="Phase 1.5"
              title="Placeholder로 먼저 들어갈 화면"
              description="운영 화면 진입과 정보 구조는 먼저 만들되, 액션은 백엔드 확장 전까지 제한합니다."
              badgeLabel="Backend Gap"
              badgeColor="orange"
              items={partialModules}
            />

            <StatusSection
              eyebrow="Execution"
              title="즉시 착수 순서"
              description="공통 기반을 만든 다음, Support/Campus/Notice/Admin 화면부터 순차적으로 확장합니다."
              badgeLabel="In Progress"
              badgeColor="blue"
              items={immediateTasks}
            />
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
}
