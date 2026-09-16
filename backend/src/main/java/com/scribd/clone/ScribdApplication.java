package com.scribd.clone;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class ScribdApplication {

    public static void main(String[] args) {
        SpringApplication.run(ScribdApplication.class, args);
    }
}
