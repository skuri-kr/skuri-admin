import {
  Badge,
  Box,
  Grid,
  GridItem,
  Heading,
  List,
  Stack,
  Text,
} from "@chakra-ui/react";
import type { AdminModule } from "@/lib/admin/modules";

const statusMap = {
  ready: { label: "API Ready", palette: "green" },
  partial: { label: "Partial", palette: "orange" },
  placeholder: { label: "Placeholder", palette: "gray" },
} as const;

export function AdminModulePage({ module }: { module: AdminModule }) {
  const status = statusMap[module.status];

  return (
    <Stack gap="6">
      <Stack gap="3">
        <Badge
          alignSelf="start"
          colorPalette={status.palette}
          rounded="full"
          px="3"
          py="1"
        >
          {status.label}
        </Badge>
        <Heading size="2xl">{module.title}</Heading>
        <Text maxW="4xl" color="gray.600" _dark={{ color: "gray.300" }}>
          {module.summary}
        </Text>
      </Stack>

      <Grid templateColumns={{ base: "1fr", xl: "1fr 1fr" }} gap="5">
        <GridItem>
          <Box
            rounded="2xl"
            borderWidth="1px"
            borderColor="blackAlpha.100"
            bg="white"
            px="6"
            py="5"
            shadow="sm"
            _dark={{ bg: "gray.900", borderColor: "whiteAlpha.200" }}
          >
            <Stack gap="4">
              <Heading size="md">현재 바로 연결 가능한 API</Heading>
              {module.availableApis.length ? (
                <List.Root gap="2" ps="5">
                  {module.availableApis.map((api) => (
                    <List.Item key={api}>
                      <Text fontFamily="var(--font-geist-mono), monospace" fontSize="sm">
                        {api}
                      </Text>
                    </List.Item>
                  ))}
                </List.Root>
              ) : (
                <Text color="gray.500">아직 연결 가능한 API가 없습니다.</Text>
              )}
            </Stack>
          </Box>
        </GridItem>

        <GridItem>
          <Box
            rounded="2xl"
            borderWidth="1px"
            borderColor="blackAlpha.100"
            bg="white"
            px="6"
            py="5"
            shadow="sm"
            _dark={{ bg: "gray.900", borderColor: "whiteAlpha.200" }}
          >
            <Stack gap="4">
              <Heading size="md">추가로 필요한 API</Heading>
              {module.gapApis.length ? (
                <List.Root gap="2" ps="5">
                  {module.gapApis.map((api) => (
                    <List.Item key={api}>
                      <Text fontFamily="var(--font-geist-mono), monospace" fontSize="sm">
                        {api}
                      </Text>
                    </List.Item>
                  ))}
                </List.Root>
              ) : (
                <Text color="gray.500">
                  현재 문서 기준으로 추가 백엔드 API 없이 진행 가능합니다.
                </Text>
              )}
            </Stack>
          </Box>
        </GridItem>
      </Grid>
    </Stack>
  );
}

