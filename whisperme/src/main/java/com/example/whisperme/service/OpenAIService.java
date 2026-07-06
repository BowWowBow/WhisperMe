package com.example.whisperme.service;

import com.example.whisperme.domain.ChatMessage;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.io.File;
import java.nio.file.Files;
import java.util.*;

@Service
public class OpenAIService {

    @Value("${openai.api.key}")
    private String apiKey;

    @Value("${file.upload-dir}")
    private String uploadDir;

    public String ask(String message) {

        List<ChatMessage> messages = new ArrayList<>();

        ChatMessage userMessage = new ChatMessage();
        userMessage.setRole("USER");
        userMessage.setContent(message);
        userMessage.setMessageType("TEXT");

        messages.add(userMessage);

        return askWithHistory(messages);
    }

    public String askWithImage(String message, String fileUrl) {

        try {
            RestTemplate restTemplate = new RestTemplate();

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBearerAuth(apiKey);

            String savedFileName = fileUrl.substring(fileUrl.lastIndexOf("/") + 1);
            File imageFile = new File(uploadDir, savedFileName);

            System.out.println("이미지 경로 확인: " + imageFile.getAbsolutePath());
            System.out.println("이미지 존재 여부: " + imageFile.exists());

            byte[] imageBytes = Files.readAllBytes(imageFile.toPath());
            String base64 = Base64.getEncoder().encodeToString(imageBytes);

            String mimeType = Files.probeContentType(imageFile.toPath());
            if (mimeType == null) {
                mimeType = "image/jpeg";
            }

            String dataUrl = "data:" + mimeType + ";base64," + base64;

            Map<String, Object> body = new HashMap<>();
            body.put("model", "gpt-4.1-mini");

            List<Map<String, Object>> messages = new ArrayList<>();

            Map<String, Object> systemMessage = new HashMap<>();
            systemMessage.put("role", "system");
            systemMessage.put(
                    "content",
                    """
                    너는 WhisperMe AI야.
                    사용자가 이미지를 올리면 이미지를 직접 보고 자세히 설명해.
                    답변은 자연스럽고 이해하기 쉽게 한국어로 작성해.
                    """
            );
            messages.add(systemMessage);

            Map<String, Object> userMessage = new HashMap<>();
            userMessage.put("role", "user");

            List<Map<String, Object>> contentList = new ArrayList<>();

            Map<String, Object> textContent = new HashMap<>();
            textContent.put("type", "text");
            textContent.put(
                    "text",
                    message == null || message.isBlank()
                            ? "이 이미지에 대해 설명해줘."
                            : message
            );
            contentList.add(textContent);

            Map<String, Object> imageUrl = new HashMap<>();
            imageUrl.put("url", dataUrl);

            Map<String, Object> imageContent = new HashMap<>();
            imageContent.put("type", "image_url");
            imageContent.put("image_url", imageUrl);
            contentList.add(imageContent);

            userMessage.put("content", contentList);
            messages.add(userMessage);

            body.put("messages", messages);

            HttpEntity<Map<String, Object>> entity =
                    new HttpEntity<>(body, headers);

            String response = restTemplate.postForObject(
                    "https://api.openai.com/v1/chat/completions",
                    entity,
                    String.class
            );

            ObjectMapper mapper = new ObjectMapper();
            JsonNode root = mapper.readTree(response);

            return root.get("choices")
                    .get(0)
                    .get("message")
                    .get("content")
                    .asText();

        } catch (Exception e) {
            e.printStackTrace();
            return "이미지 분석 실패";
        }
    }

    public String askWithImages(String message, List<String> fileUrls) {

        try {
            RestTemplate restTemplate = new RestTemplate();

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBearerAuth(apiKey);

            Map<String, Object> body = new HashMap<>();
            body.put("model", "gpt-4.1-mini");

            List<Map<String, Object>> messages = new ArrayList<>();

            Map<String, Object> systemMessage = new HashMap<>();
            systemMessage.put("role", "system");
            systemMessage.put(
                    "content",
                    """
                    너는 WhisperMe AI야.
                    여러 장의 이미지를 한 번에 보고 첫 번째, 두 번째, 세 번째처럼 구분해서 설명해.
                    사용자가 비교를 원하면 공통점과 차이점도 설명해.
                    답변은 한국어로 이해하기 쉽게 작성해.
                    """
            );
            messages.add(systemMessage);

            Map<String, Object> userMessage = new HashMap<>();
            userMessage.put("role", "user");

            List<Map<String, Object>> contentList = new ArrayList<>();

            Map<String, Object> textContent = new HashMap<>();
            textContent.put("type", "text");
            textContent.put(
                    "text",
                    message == null || message.isBlank()
                            ? "이 여러 장의 이미지에 대해 설명해줘."
                            : message
            );
            contentList.add(textContent);

            if (fileUrls != null) {
                for (String fileUrl : fileUrls) {

                    if (fileUrl == null || fileUrl.isBlank()) {
                        continue;
                    }

                    String savedFileName = fileUrl.substring(fileUrl.lastIndexOf("/") + 1);
                    File imageFile = new File(uploadDir, savedFileName);

                    System.out.println("이미지 경로 확인: " + imageFile.getAbsolutePath());
                    System.out.println("이미지 존재 여부: " + imageFile.exists());

                    if (!imageFile.exists()) {
                        continue;
                    }

                    byte[] imageBytes = Files.readAllBytes(imageFile.toPath());
                    String base64 = Base64.getEncoder().encodeToString(imageBytes);

                    String mimeType = Files.probeContentType(imageFile.toPath());
                    if (mimeType == null) {
                        mimeType = "image/jpeg";
                    }

                    String dataUrl = "data:" + mimeType + ";base64," + base64;

                    Map<String, Object> imageUrl = new HashMap<>();
                    imageUrl.put("url", dataUrl);

                    Map<String, Object> imageContent = new HashMap<>();
                    imageContent.put("type", "image_url");
                    imageContent.put("image_url", imageUrl);

                    contentList.add(imageContent);
                }
            }

            userMessage.put("content", contentList);
            messages.add(userMessage);

            body.put("messages", messages);

            HttpEntity<Map<String, Object>> entity =
                    new HttpEntity<>(body, headers);

            String response = restTemplate.postForObject(
                    "https://api.openai.com/v1/chat/completions",
                    entity,
                    String.class
            );

            ObjectMapper mapper = new ObjectMapper();
            JsonNode root = mapper.readTree(response);

            return root.get("choices")
                    .get(0)
                    .get("message")
                    .get("content")
                    .asText();

        } catch (Exception e) {
            e.printStackTrace();
            return "여러 이미지 분석 실패";
        }
    }

    public String askWithHistory(List<ChatMessage> chatMessages) {

        try {
            RestTemplate restTemplate = new RestTemplate();

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBearerAuth(apiKey);

            Map<String, Object> body = new HashMap<>();
            body.put("model", "gpt-4.1-mini");

            List<Map<String, String>> messages = new ArrayList<>();

            Map<String, String> systemMessage = new HashMap<>();
            systemMessage.put("role", "system");
            systemMessage.put(
                    "content",
                    """
                    너는 WhisperMe AI야.

                    대화 목록의 마지막 user 메시지가 사용자의 현재 질문이야.
                    반드시 마지막 user 메시지에 답변해.

                    이전 대화 흐름은 참고하되,
                    현재 질문과 상관없는 내용은 억지로 끌고 오지 마.

                    사용자가 짧게 말해도 바로 앞 질문의 맥락을 이어서 이해해.

                    답변 원칙:
                    1. 항상 한국어로 답변한다.
                    2. 쉽게 설명한다.
                    3. 필요한 경우 예시를 든다.
                    4. 모르는 내용은 아는 척하지 않는다.
                    5. 너무 딱딱하지 않게 자연스럽게 답한다.
                    """
            );
            messages.add(systemMessage);

            addChatHistory(messages, chatMessages);

            body.put("messages", messages);

            return callOpenAi(body);

        } catch (Exception e) {
            e.printStackTrace();
            return "GPT 호출 실패";
        }
    }

    public String askWithSearchResult(List<ChatMessage> chatMessages,
                                      String question,
                                      String searchResult) {

        try {
            RestTemplate restTemplate = new RestTemplate();

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBearerAuth(apiKey);

            Map<String, Object> body = new HashMap<>();
            body.put("model", "gpt-4.1-mini");

            List<Map<String, String>> messages = new ArrayList<>();

            Map<String, String> systemMessage = new HashMap<>();
            systemMessage.put("role", "system");
            systemMessage.put(
                    "content",
                    """
                    너는 WhisperMe AI야.

                    사용자의 질문이 최신정보와 관련 있으면
                    제공된 네이버 검색 결과를 반드시 우선 참고해서 답변해.

                    최신정보 예시:
                    뉴스, 날씨, 주가, 환율, 스포츠 경기 결과, 정치, 사건사고,
                    연예, 제품 가격, 병원, 지역 정보, 여행 정보, 일정, 순위 등.

                    답변 형식은 가능하면 아래처럼 작성해.

                    📌 핵심 요약
                    - 사용자가 궁금해하는 내용을 짧게 정리

                    🔍 검색 결과 기준
                    - 네이버 검색 결과에서 확인되는 내용 정리
                    - 최신순 결과를 우선 반영

                    💡 자세한 설명
                    - 사용자가 이해하기 쉽게 추가 설명

                    ✅ 결론
                    - 최종 답변

                    중요한 규칙:
                    1. 검색 결과에 없는 내용은 확정적으로 말하지 마.
                    2. 검색 결과에 없으면 "검색 결과 기준으로는 확인되지 않습니다"라고 말해.
                    3. 검색 결과가 부족하면 부족하다고 말해.
                    4. 링크가 있으면 참고 링크로 안내해.
                    5. 사용자의 질문에 직접 답해.
                    6. 답변은 항상 자연스러운 한국어로 작성해.
                    """
            );
            messages.add(systemMessage);

            addChatHistory(messages, chatMessages);

            Map<String, String> searchMessage = new HashMap<>();
            searchMessage.put(
                    "role",
                    "user"
            );

            searchMessage.put(
                    "content",
                    "사용자 현재 질문:\n" +
                            question +
                            "\n\n" +
                            "아래는 네이버 최신 검색 결과야.\n" +
                            "이 검색 결과를 우선 근거로 삼아서 답변해.\n\n" +
                            searchResult
            );

            messages.add(searchMessage);

            body.put("messages", messages);

            return callOpenAi(body);

        } catch (Exception e) {
            e.printStackTrace();
            return "최신정보 기반 GPT 호출 실패";
        }
    }

    private void addChatHistory(List<Map<String, String>> messages,
                                List<ChatMessage> chatMessages) {

        if (chatMessages == null) {
            return;
        }

        for (ChatMessage chatMessage : chatMessages) {

            if (chatMessage == null) continue;
            if (chatMessage.getContent() == null || chatMessage.getContent().trim().isEmpty()) continue;

            String messageType = chatMessage.getMessageType();

            if (messageType != null && !"TEXT".equals(messageType)) continue;

            Map<String, String> msg = new HashMap<>();

            if ("USER".equals(chatMessage.getRole())) {
                msg.put("role", "user");
            } else {
                msg.put("role", "assistant");
            }

            msg.put("content", chatMessage.getContent());
            messages.add(msg);
        }
    }

    private String callOpenAi(Map<String, Object> body) throws Exception {

        RestTemplate restTemplate = new RestTemplate();

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(apiKey);

        HttpEntity<Map<String, Object>> entity =
                new HttpEntity<>(body, headers);

        String response = restTemplate.postForObject(
                "https://api.openai.com/v1/chat/completions",
                entity,
                String.class
        );

        ObjectMapper mapper = new ObjectMapper();
        JsonNode root = mapper.readTree(response);

        return root.get("choices")
                .get(0)
                .get("message")
                .get("content")
                .asText();
    }
}